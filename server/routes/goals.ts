import { Router } from 'express';
import { db } from '../db';
import { financialGoals, insertFinancialGoalSchema, connectedAccounts } from '@shared/schema';
import { requireAuth } from '../middleware/jwt-auth';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

router.get('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const goals = await db.select()
      .from(financialGoals)
      .where(eq(financialGoals.userId, userId))
      .orderBy(desc(financialGoals.createdAt));

    const goalsWithAccounts = await Promise.all(goals.map(async (goal) => {
      let linkedAccount = null;
      if (goal.linkedAccountId) {
        // Only include linked account if it belongs to the user (security check)
        const [account] = await db.select()
          .from(connectedAccounts)
          .where(and(
            eq(connectedAccounts.id, goal.linkedAccountId),
            eq(connectedAccounts.userId, userId)
          ))
          .limit(1);
        linkedAccount = account ? {
          id: account.id,
          accountName: account.accountName,
          institutionName: account.institutionName,
          balance: Number(account.balance),
        } : null;
      }
      return {
        ...goal,
        targetAmount: Number(goal.targetAmount),
        currentAmount: Number(goal.currentAmount || 0),
        monthlyContribution: goal.monthlyContribution ? Number(goal.monthlyContribution) : null,
        linkedAccount,
      };
    }));

    return res.json({ goals: goalsWithAccounts });
  } catch (error) {
    console.error('[Goals] Error fetching goals:', error);
    return res.status(500).json({ message: 'Failed to fetch goals' });
  }
});

router.post('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const parseResult = insertFinancialGoalSchema.safeParse({
      ...req.body,
      userId,
    });

    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: parseResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const goalData = parseResult.data;

    // Verify linked account belongs to the user if provided
    if (goalData.linkedAccountId) {
      const [linkedAccount] = await db.select()
        .from(connectedAccounts)
        .where(and(
          eq(connectedAccounts.id, goalData.linkedAccountId),
          eq(connectedAccounts.userId, userId)
        ))
        .limit(1);
      
      if (!linkedAccount) {
        return res.status(400).json({ message: 'Invalid linked account' });
      }
    }

    const [newGoal] = await db.insert(financialGoals).values({
      userId: goalData.userId,
      goalType: goalData.goalType,
      name: goalData.name,
      targetAmount: String(goalData.targetAmount),
      currentAmount: goalData.currentAmount ? String(goalData.currentAmount) : '0',
      linkedAccountId: goalData.linkedAccountId || null,
      deadline: goalData.deadline || null,
      monthlyContribution: goalData.monthlyContribution ? String(goalData.monthlyContribution) : null,
      status: goalData.status || 'active',
    }).returning();

    console.log('[Goals] Created new goal:', { goalId: newGoal.id, userId });

    return res.status(201).json({
      message: 'Goal created successfully',
      goal: {
        ...newGoal,
        targetAmount: Number(newGoal.targetAmount),
        currentAmount: Number(newGoal.currentAmount || 0),
        monthlyContribution: newGoal.monthlyContribution ? Number(newGoal.monthlyContribution) : null,
      },
    });
  } catch (error) {
    console.error('[Goals] Error creating goal:', error);
    return res.status(500).json({ message: 'Failed to create goal' });
  }
});

router.patch('/:id', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id;
    const goalId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (isNaN(goalId)) {
      return res.status(400).json({ message: 'Invalid goal ID' });
    }

    const [existingGoal] = await db.select()
      .from(financialGoals)
      .where(and(
        eq(financialGoals.id, goalId),
        eq(financialGoals.userId, userId)
      ))
      .limit(1);

    if (!existingGoal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const updateSchema = z.object({
      name: z.string().optional(),
      targetAmount: z.union([z.string(), z.number()]).optional(),
      currentAmount: z.union([z.string(), z.number()]).optional(),
      linkedAccountId: z.number().nullable().optional(),
      deadline: z.string().nullable().optional(),
      monthlyContribution: z.union([z.string(), z.number()]).nullable().optional(),
      status: z.enum(['active', 'completed', 'paused']).optional(),
    });

    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: parseResult.error.errors,
      });
    }

    const updates: any = { updatedAt: new Date() };
    const data = parseResult.data;

    // Verify linked account ownership if updating linkedAccountId
    if (data.linkedAccountId !== undefined && data.linkedAccountId !== null) {
      const [linkedAccount] = await db.select()
        .from(connectedAccounts)
        .where(and(
          eq(connectedAccounts.id, data.linkedAccountId),
          eq(connectedAccounts.userId, userId)
        ))
        .limit(1);
      
      if (!linkedAccount) {
        return res.status(400).json({ message: 'Invalid linked account' });
      }
    }

    if (data.name !== undefined) updates.name = data.name;
    if (data.targetAmount !== undefined) updates.targetAmount = String(data.targetAmount);
    if (data.currentAmount !== undefined) updates.currentAmount = String(data.currentAmount);
    if (data.linkedAccountId !== undefined) updates.linkedAccountId = data.linkedAccountId;
    if (data.deadline !== undefined) updates.deadline = data.deadline ? new Date(data.deadline) : null;
    if (data.monthlyContribution !== undefined) updates.monthlyContribution = data.monthlyContribution ? String(data.monthlyContribution) : null;
    if (data.status !== undefined) updates.status = data.status;

    const [updatedGoal] = await db.update(financialGoals)
      .set(updates)
      .where(and(
        eq(financialGoals.id, goalId),
        eq(financialGoals.userId, userId)
      ))
      .returning();

    return res.json({
      message: 'Goal updated successfully',
      goal: {
        ...updatedGoal,
        targetAmount: Number(updatedGoal.targetAmount),
        currentAmount: Number(updatedGoal.currentAmount || 0),
        monthlyContribution: updatedGoal.monthlyContribution ? Number(updatedGoal.monthlyContribution) : null,
      },
    });
  } catch (error) {
    console.error('[Goals] Error updating goal:', error);
    return res.status(500).json({ message: 'Failed to update goal' });
  }
});

router.delete('/:id', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id;
    const goalId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (isNaN(goalId)) {
      return res.status(400).json({ message: 'Invalid goal ID' });
    }

    const [deletedGoal] = await db.delete(financialGoals)
      .where(and(
        eq(financialGoals.id, goalId),
        eq(financialGoals.userId, userId)
      ))
      .returning();

    if (!deletedGoal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    console.log('[Goals] Deleted goal:', { goalId, userId });

    return res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('[Goals] Error deleting goal:', error);
    return res.status(500).json({ message: 'Failed to delete goal' });
  }
});

router.post('/:id/sync', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id;
    const goalId = parseInt(req.params.id);
    
    if (!userId || isNaN(goalId)) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    const [goal] = await db.select()
      .from(financialGoals)
      .where(and(
        eq(financialGoals.id, goalId),
        eq(financialGoals.userId, userId)
      ))
      .limit(1);

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    if (!goal.linkedAccountId) {
      return res.json({ message: 'No linked account to sync', goal });
    }

    // Verify account belongs to user for security
    const [account] = await db.select()
      .from(connectedAccounts)
      .where(and(
        eq(connectedAccounts.id, goal.linkedAccountId),
        eq(connectedAccounts.userId, userId)
      ))
      .limit(1);

    if (!account) {
      return res.json({ message: 'Linked account not found or access denied', goal });
    }

    let newCurrentAmount: number;
    
    if (goal.goalType === 'debt_payoff') {
      const originalDebt = Number(goal.targetAmount);
      const currentDebt = Math.abs(Number(account.balance));
      newCurrentAmount = Math.max(0, originalDebt - currentDebt);
    } else {
      newCurrentAmount = Number(account.balance);
    }

    const [updatedGoal] = await db.update(financialGoals)
      .set({
        currentAmount: String(newCurrentAmount),
        updatedAt: new Date(),
      })
      .where(eq(financialGoals.id, goalId))
      .returning();

    return res.json({
      message: 'Goal synced with account',
      goal: {
        ...updatedGoal,
        targetAmount: Number(updatedGoal.targetAmount),
        currentAmount: Number(updatedGoal.currentAmount || 0),
        monthlyContribution: updatedGoal.monthlyContribution ? Number(updatedGoal.monthlyContribution) : null,
      },
    });
  } catch (error) {
    console.error('[Goals] Error syncing goal:', error);
    return res.status(500).json({ message: 'Failed to sync goal' });
  }
});

export default router;
