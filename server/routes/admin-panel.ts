import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { isAuthenticated } from '../replitAuth';
import { requireAdmin, logAdminAction } from '../middleware/admin';
import { db } from '../db';
import {
  accountApplications,
  users,
  connectedAccounts,
  snaptradeConnections,
  auditLogs,
  featureFlags,
  passwordResetTokens,
  emailLogs,
} from '@shared/schema';
import { eq, desc, and, sql, count, gte, lte } from 'drizzle-orm';
import { sendApprovalEmail, sendRejectionEmail, sendPasswordResetEmail } from '../services/email';
import { hashToken, generateSecureToken } from '../lib/token-utils';
import { getAllSnapUsers } from '../store/snapUsers';
import { getAccountLimit } from '../routes';

const router = Router();

// ============================================================================
// APPLICATION MANAGEMENT
// ============================================================================

// GET /api/admin/applications - Get all applications with pagination/filtering
router.get('/applications', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      status,
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let query = db.select().from(accountApplications);

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.where(eq(accountApplications.status, status as string)) as any;
    }

    // Apply sorting
    const orderedQuery = sortOrder === 'desc' 
      ? query.orderBy(desc(accountApplications.submittedAt))
      : query.orderBy(accountApplications.submittedAt);

    // Get paginated results
    const applications = await orderedQuery.limit(limitNum).offset(offset);

    // Get total count for pagination
    const [{ total }] = await db
      .select({ total: count() })
      .from(accountApplications)
      .where(status && status !== 'all' ? eq(accountApplications.status, status as string) : sql`true`);

    await logAdminAction(
      req.adminEmail,
      'view_applications',
      { page: pageNum, limit: limitNum, status, total }
    );

    res.json({
      applications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

// POST /api/admin/applications/:id/approve - Approve application
router.post('/applications/:id/approve', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { id } = req.params;
    const applicationId = parseInt(id);

    // Get application
    const [application] = await db
      .select()
      .from(accountApplications)
      .where(eq(accountApplications.id, applicationId));

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Application has already been reviewed' });
    }

    // Check if user with this email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, application.email));

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email already exists',
        conflict: true 
      });
    }

    // Create user account
    const userId = crypto.randomUUID();
    let newUser;
    
    try {
      [newUser] = await db
        .insert(users)
        .values({
          id: userId,
          email: application.email,
          firstName: application.firstName,
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          isAdmin: false,
          isBanned: false,
        })
        .returning();
    } catch (dbError: any) {
      // Handle unique constraint error gracefully
      if (dbError.code === '23505' || dbError.constraint?.includes('email')) {
        return res.status(400).json({ 
          message: 'User with this email already exists',
          conflict: true 
        });
      }
      throw dbError;
    }

    // Generate password setup token (plaintext)
    const resetToken = generateSecureToken(32);
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store only the HASH in database for security
    await db.insert(passwordResetTokens).values({
      userId: newUser.id,
      token: tokenHash,
      expiresAt,
      used: false,
    });

    // Update application status
    await db
      .update(accountApplications)
      .set({
        status: 'approved',
        reviewedBy: req.adminEmail,
        reviewedAt: new Date(),
      })
      .where(eq(accountApplications.id, applicationId));

    // Send approval email with password setup link
    // IMPORTANT: Send the UNHASHED token to the user
    const passwordSetupLink = `${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/setup-password?token=${resetToken}`;
    
    const emailResult = await sendApprovalEmail(
      application.email,
      application.firstName,
      passwordSetupLink
    );

    await logAdminAction(
      req.adminEmail,
      'approve_application',
      { 
        applicationId, 
        email: application.email, 
        userId: newUser.id,
        emailSent: emailResult.success 
      },
      newUser.id
    );

    res.json({
      message: 'Application approved successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
      },
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({ message: 'Failed to approve application' });
  }
});

// POST /api/admin/applications/:id/reject - Reject application
router.post('/applications/:id/reject', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;
    const applicationId = parseInt(id);

    // Get application
    const [application] = await db
      .select()
      .from(accountApplications)
      .where(eq(accountApplications.id, applicationId));

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Application has already been reviewed' });
    }

    // Update application status
    await db
      .update(accountApplications)
      .set({
        status: 'rejected',
        reviewedBy: req.adminEmail,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      })
      .where(eq(accountApplications.id, applicationId));

    // Send rejection email
    const emailResult = await sendRejectionEmail(
      application.email,
      application.firstName
    );

    await logAdminAction(
      req.adminEmail,
      'reject_application',
      { 
        applicationId, 
        email: application.email,
        reviewNotes,
        emailSent: emailResult.success 
      }
    );

    res.json({
      message: 'Application rejected successfully',
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ message: 'Failed to reject application' });
  }
});

// GET /api/admin/applications/stats - Get application statistics
router.get('/applications/stats', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const stats = await db
      .select({
        status: accountApplications.status,
        count: count(),
      })
      .from(accountApplications)
      .groupBy(accountApplications.status);

    const statsMap = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    stats.forEach((stat) => {
      if (stat.status && stat.status in statsMap) {
        statsMap[stat.status as keyof typeof statsMap] = Number(stat.count);
      }
    });

    await logAdminAction(req.adminEmail, 'view_application_stats', statsMap);

    res.json(statsMap);
  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({ message: 'Failed to fetch application statistics' });
  }
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

// GET /api/admin/users - Get all users with pagination
router.get('/users', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { 
      page = '1', 
      limit = '20',
      search,
      tier,
      banned,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let conditions = [];

    // Filter by search (email or name)
    if (search) {
      conditions.push(
        sql`(LOWER(${users.email}) LIKE LOWER(${'%' + search + '%'}) OR 
             LOWER(${users.firstName}) LIKE LOWER(${'%' + search + '%'}) OR 
             LOWER(${users.lastName}) LIKE LOWER(${'%' + search + '%'}))`
      );
    }

    // Filter by tier
    if (tier && tier !== 'all') {
      conditions.push(eq(users.subscriptionTier, tier as string));
    }

    // Filter by banned status
    if (banned === 'true') {
      conditions.push(eq(users.isBanned, true));
    } else if (banned === 'false') {
      conditions.push(eq(users.isBanned, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : sql`true`;

    // Get paginated users
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        subscriptionTier: users.subscriptionTier,
        subscriptionStatus: users.subscriptionStatus,
        isAdmin: users.isAdmin,
        isBanned: users.isBanned,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(sortOrder === 'desc' ? desc(users.createdAt) : users.createdAt)
      .limit(limitNum)
      .offset(offset);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(whereClause);

    await logAdminAction(req.adminEmail, 'view_users', { 
      page: pageNum, 
      limit: limitNum, 
      total: Number(total) 
    });

    res.json({
      users: usersList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// DELETE /api/admin/users/:userId - Soft delete user (ban)
router.delete('/users/:userId', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { userId } = req.params;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting admin users
    if (user.isAdmin) {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }

    // Soft delete by setting isBanned to true
    await db
      .update(users)
      .set({ 
        isBanned: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await logAdminAction(
      req.adminEmail,
      'ban_user',
      { userId, email: user.email },
      userId
    );

    res.json({ message: 'User banned successfully' });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ message: 'Failed to ban user' });
  }
});

// POST /api/admin/users/:userId/reset-password - Generate password reset token
router.post('/users/:userId/reset-password', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { userId } = req.params;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate password reset token (plaintext)
    const resetToken = generateSecureToken(32);
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store only the HASH in database for security
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: tokenHash,
      expiresAt,
      used: false,
    });

    // Send password reset email
    // IMPORTANT: Send the UNHASHED token to the user
    const baseUrl = process.env.REPL_SLUG && process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPL_SLUG}.${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : req.protocol + '://' + req.get('host');
    const resetLink = `${baseUrl}/setup-password?token=${resetToken}`;
    
    const emailResult = await sendPasswordResetEmail(
      user.email!,
      user.firstName || 'User',
      resetLink
    );

    await logAdminAction(
      req.adminEmail,
      'send_password_reset',
      { userId, email: user.email, emailSent: emailResult.success },
      userId
    );

    // If email provider is not configured, return the reset link for manual delivery
    const hasEmailProvider = !!process.env.RESEND_API_KEY;

    res.json({
      message: hasEmailProvider 
        ? 'Password reset email sent successfully' 
        : 'Password reset link generated (email provider not configured)',
      emailSent: emailResult.success,
      resetLink: !hasEmailProvider ? resetLink : undefined,
    });
  } catch (error) {
    console.error('Error sending password reset:', error);
    res.status(500).json({ message: 'Failed to send password reset' });
  }
});

// POST /api/admin/users/:userId/set-password - Directly set user password (admin only)
const setPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post('/users/:userId/set-password', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { userId } = req.params;
    const parseResult = setPasswordSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Invalid password',
        errors: parseResult.error.errors,
      });
    }

    const { password } = parseResult.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash the password using bcrypt
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password
    await db
      .update(users)
      .set({ 
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await logAdminAction(
      req.adminEmail,
      'set_user_password',
      { userId, email: user.email },
      userId
    );

    res.json({ message: 'Password set successfully' });
  } catch (error) {
    console.error('Error setting password:', error);
    res.status(500).json({ message: 'Failed to set password' });
  }
});

// PATCH /api/admin/users/:userId/tier - Update user subscription tier
const updateTierSchema = z.object({
  tier: z.enum(['free', 'basic', 'pro', 'premium']),
});

router.patch('/users/:userId/tier', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { userId } = req.params;
    const parseResult = updateTierSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Invalid tier',
        errors: parseResult.error.errors,
      });
    }

    const { tier } = parseResult.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldTier = user.subscriptionTier;

    await db
      .update(users)
      .set({ 
        subscriptionTier: tier,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await logAdminAction(
      req.adminEmail,
      'update_user_tier',
      { userId, email: user.email, oldTier, newTier: tier },
      userId
    );

    res.json({
      message: 'User tier updated successfully',
      tier,
    });
  } catch (error) {
    console.error('Error updating user tier:', error);
    res.status(500).json({ message: 'Failed to update user tier' });
  }
});

// PATCH /api/admin/users/:userId/ban - Toggle ban status
const banSchema = z.object({
  banned: z.boolean(),
});

router.patch('/users/:userId/ban', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { userId } = req.params;
    const parseResult = banSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Invalid ban status',
        errors: parseResult.error.errors,
      });
    }

    const { banned } = parseResult.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent banning admin users
    if (user.isAdmin && banned) {
      return res.status(403).json({ message: 'Cannot ban admin users' });
    }

    await db
      .update(users)
      .set({ 
        isBanned: banned,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await logAdminAction(
      req.adminEmail,
      banned ? 'ban_user' : 'unban_user',
      { userId, email: user.email },
      userId
    );

    res.json({
      message: `User ${banned ? 'banned' : 'unbanned'} successfully`,
      banned,
    });
  } catch (error) {
    console.error('Error updating ban status:', error);
    res.status(500).json({ message: 'Failed to update ban status' });
  }
});

// ============================================================================
// ANALYTICS
// ============================================================================

// GET /api/admin/analytics/overview - KPIs
router.get('/analytics/overview', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    // Total users
    const [{ totalUsers }] = await db
      .select({ totalUsers: count() })
      .from(users);

    // Active users (not banned)
    const [{ activeUsers }] = await db
      .select({ activeUsers: count() })
      .from(users)
      .where(eq(users.isBanned, false));

    // Total connections (both Teller and SnapTrade)
    const [{ tellerConnections }] = await db
      .select({ tellerConnections: count() })
      .from(connectedAccounts)
      .where(and(
        eq(connectedAccounts.provider, 'teller'),
        eq(connectedAccounts.status, 'connected')
      ));

    const snapUsers = await getAllSnapUsers();
    const snaptradeConnectionsCount = Object.keys(snapUsers).length;

    // Revenue estimate (based on subscription tiers)
    const tierPrices = {
      free: 0,
      basic: 9.99,
      pro: 29.99,
      premium: 99.99,
    };

    const subscriptions = await db
      .select({
        tier: users.subscriptionTier,
        count: count(),
      })
      .from(users)
      .where(and(
        eq(users.subscriptionStatus, 'active'),
        eq(users.isBanned, false)
      ))
      .groupBy(users.subscriptionTier);

    let monthlyRevenue = 0;
    subscriptions.forEach((sub) => {
      const tier = sub.tier as keyof typeof tierPrices;
      monthlyRevenue += tierPrices[tier] * Number(sub.count);
    });

    const overview = {
      totalUsers: Number(totalUsers),
      activeUsers: Number(activeUsers),
      totalConnections: Number(tellerConnections) + Number(snaptradeConnectionsCount),
      tellerConnections: Number(tellerConnections),
      snaptradeConnections: Number(snaptradeConnectionsCount),
      monthlyRevenue: monthlyRevenue.toFixed(2),
      annualRevenue: (monthlyRevenue * 12).toFixed(2),
    };

    await logAdminAction(req.adminEmail, 'view_analytics_overview', overview);

    res.json(overview);
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ message: 'Failed to fetch analytics overview' });
  }
});

// GET /api/admin/analytics/connections - Connection statistics by provider
router.get('/analytics/connections', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    // Teller connections by status
    const tellerStats = await db
      .select({
        status: connectedAccounts.status,
        count: count(),
      })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.provider, 'teller'))
      .groupBy(connectedAccounts.status);

    // SnapTrade connections stats
    const [{ snaptradeActive }] = await db
      .select({ snaptradeActive: count() })
      .from(snaptradeConnections)
      .where(eq(snaptradeConnections.disabled, false));

    const [{ snaptradeDisabled }] = await db
      .select({ snaptradeDisabled: count() })
      .from(snaptradeConnections)
      .where(eq(snaptradeConnections.disabled, true));

    // SnapTrade connections by brokerage
    const snaptradeByBrokerage = await db
      .select({
        brokerage: snaptradeConnections.brokerageName,
        count: count(),
      })
      .from(snaptradeConnections)
      .where(eq(snaptradeConnections.disabled, false))
      .groupBy(snaptradeConnections.brokerageName);

    const stats = {
      teller: {
        total: tellerStats.reduce((sum, stat) => sum + Number(stat.count), 0),
        byStatus: tellerStats.map(stat => ({
          status: stat.status,
          count: Number(stat.count),
        })),
      },
      snaptrade: {
        active: Number(snaptradeActive),
        disabled: Number(snaptradeDisabled),
        total: Number(snaptradeActive) + Number(snaptradeDisabled),
        byBrokerage: snaptradeByBrokerage.map(stat => ({
          brokerage: stat.brokerage,
          count: Number(stat.count),
        })),
      },
    };

    await logAdminAction(req.adminEmail, 'view_connection_analytics', stats);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching connection analytics:', error);
    res.status(500).json({ message: 'Failed to fetch connection analytics' });
  }
});

// GET /api/admin/analytics/errors - Error logs
router.get('/analytics/errors', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string);
    const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    // Get failed emails
    const failedEmails = await db
      .select({
        template: emailLogs.template,
        count: count(),
      })
      .from(emailLogs)
      .where(and(
        eq(emailLogs.status, 'failed'),
        gte(emailLogs.sentAt, startDate)
      ))
      .groupBy(emailLogs.template);

    const errorStats = {
      failedEmails: {
        total: failedEmails.reduce((sum, stat) => sum + Number(stat.count), 0),
        byTemplate: failedEmails.map(stat => ({
          template: stat.template,
          count: Number(stat.count),
        })),
      },
      period: `Last ${daysNum} days`,
    };

    await logAdminAction(req.adminEmail, 'view_error_analytics', { days: daysNum });

    res.json(errorStats);
  } catch (error) {
    console.error('Error fetching error analytics:', error);
    res.status(500).json({ message: 'Failed to fetch error analytics' });
  }
});

// ============================================================================
// CONNECTIONS MANAGEMENT
// ============================================================================

// GET /api/admin/connections - Get all connections with user info
router.get('/connections', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { page = '1', limit = '20', provider, status, filter } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Get Teller connections with user info
    let tellerConditions = [eq(connectedAccounts.provider, 'teller'), eq(connectedAccounts.status, 'connected')];
    if (status) {
      tellerConditions = [eq(connectedAccounts.provider, 'teller'), eq(connectedAccounts.status, status as string)];
    }

    const tellerConnections = provider === 'snaptrade' ? [] : await db
      .select({
        id: connectedAccounts.id,
        userId: connectedAccounts.userId,
        email: users.email,
        tier: users.subscriptionTier,
        isAdmin: users.isAdmin,
        provider: connectedAccounts.provider,
        accountId: connectedAccounts.externalAccountId,
        accountType: connectedAccounts.accountType,
        accountName: connectedAccounts.accountName,
        institutionName: connectedAccounts.institutionName,
        status: connectedAccounts.status,
        balance: connectedAccounts.balance,
        lastSynced: connectedAccounts.lastSynced,
        createdAt: connectedAccounts.createdAt,
      })
      .from(connectedAccounts)
      .leftJoin(users, eq(connectedAccounts.userId, users.id))
      .where(and(...tellerConditions));

    // Get SnapTrade connections with user info
    let snapConditions = [eq(snaptradeConnections.disabled, false)];
    if (status === 'disabled') {
      snapConditions = [eq(snaptradeConnections.disabled, true)];
    } else if (status === 'connected') {
      snapConditions = [eq(snaptradeConnections.disabled, false)];
    }

    const snapConnections = provider === 'teller' ? [] : await db
      .select({
        id: snaptradeConnections.id,
        userId: snaptradeConnections.flintUserId,
        email: users.email,
        tier: users.subscriptionTier,
        isAdmin: users.isAdmin,
        provider: sql<string>`'snaptrade'`.as('provider'),
        accountId: sql<string>`NULL::text`.as('account_id'),
        accountType: sql<string>`'brokerage'`.as('account_type'),
        accountName: snaptradeConnections.brokerageName,
        institutionName: snaptradeConnections.brokerageName,
        status: sql<string>`CASE WHEN ${snaptradeConnections.disabled} = true THEN 'disabled' ELSE 'connected' END`.as('status'),
        balance: sql<string>`NULL::numeric`.as('balance'),
        lastSynced: snaptradeConnections.lastSyncAt,
        createdAt: snaptradeConnections.createdAt,
      })
      .from(snaptradeConnections)
      .leftJoin(users, eq(snaptradeConnections.flintUserId, users.id))
      .where(and(...snapConditions));

    // Combine and sort by userId and createdAt
    const allConnections = [...tellerConnections, ...snapConnections]
      .sort((a, b) => {
        if (a.userId !== b.userId) {
          return (a.userId || '').localeCompare(b.userId || '');
        }
        return new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime();
      });

    // Get all users to find those with zero connections (only when needed)
    let allConnectionsIncludingZero = allConnections;
    
    if (!filter || filter === 'zero_connections') {
      const allUsers = await db
        .select({
          userId: users.id,
          email: users.email,
          tier: users.subscriptionTier,
          isAdmin: users.isAdmin,
        })
        .from(users);

      // Identify users with zero connections
      const usersWithConnections = new Set(allConnections.map(c => c.userId));
      const usersWithZeroConnections = allUsers.filter(u => !usersWithConnections.has(u.userId));

      // Create synthetic connection records for zero-connection users
      const zeroConnectionRecords = usersWithZeroConnections.map(user => ({
        id: 0,
        userId: user.userId,
        email: user.email,
        tier: user.tier,
        isAdmin: user.isAdmin,
        provider: 'none' as const,
        accountId: null,
        accountType: 'none' as const,
        accountName: 'No connections',
        institutionName: 'N/A',
        status: 'none' as const,
        balance: '0',
        lastSynced: null,
        createdAt: null,
      }));

      // Include zero-connection records
      allConnectionsIncludingZero = [...allConnections, ...zeroConnectionRecords];
    }

    // Group by user to add connection limit info
    const userConnectionCounts = new Map<string, { tier: string; count: number; isAdmin: boolean }>();
    allConnectionsIncludingZero.forEach(conn => {
      if (!conn.userId) return;
      const existing = userConnectionCounts.get(conn.userId);
      if (existing) {
        existing.count++;
      } else {
        userConnectionCounts.set(conn.userId, { 
          tier: conn.tier || 'free', 
          count: conn.provider === 'none' ? 0 : 1,
          isAdmin: conn.isAdmin || false
        });
      }
    });

    // Add connection limit info to each connection
    const connectionsWithLimits = allConnectionsIncludingZero.map(conn => {
      if (!conn.userId) return conn;
      const userInfo = userConnectionCounts.get(conn.userId);
      const tier = userInfo?.tier || 'free';
      const connectionCount = userInfo?.count || 0;
      const isAdmin = userInfo?.isAdmin || false;
      
      // Get limit - returns null for admin users (unlimited)
      const limit = getAccountLimit(tier, isAdmin);
      
      // Handle admin users (unlimited connections)
      if (limit === null) {
        return {
          ...conn,
          connectionCount,
          connectionLimit: 'unlimited',
          isOverLimit: false,
        };
      }
      
      // Handle regular users with numeric limits
      const isOverLimit = connectionCount > limit;
      return {
        ...conn,
        connectionCount,
        connectionLimit: limit,
        isOverLimit,
      };
    });

    // Apply user-level filtering if specified
    let filteredConnections = connectionsWithLimits;
    
    if (filter) {
      // Group by user to apply user-level filters
      type EnrichedConnection = typeof connectionsWithLimits[number];
      const userGroups = new Map<string, EnrichedConnection[]>();
      connectionsWithLimits.forEach(conn => {
        if (!conn.userId) return;
        const existing = userGroups.get(conn.userId);
        if (existing) {
          existing.push(conn);
        } else {
          userGroups.set(conn.userId, [conn]);
        }
      });
      
      // Apply filter and flatten
      filteredConnections = [];
      userGroups.forEach((userConns) => {
        if (userConns.length === 0) return;
        
        const firstConn = userConns[0];
        const connectionCount = (firstConn as any).connectionCount || 0;
        const isOverLimit = (firstConn as any).isOverLimit || false;
        
        let includeUser = false;
        
        switch (filter) {
          case 'over_limit':
            includeUser = isOverLimit === true && connectionCount > 0;
            break;
          case 'within_limit':
            includeUser = isOverLimit === false && connectionCount > 0;
            break;
          case 'zero_connections':
            includeUser = connectionCount === 0;
            break;
          default:
            includeUser = true;
        }
        
        if (includeUser) {
          filteredConnections.push(...userConns);
        }
      });
    }

    const total = filteredConnections.length;
    const paginatedConnections = filteredConnections.slice(offset, offset + limitNum);

    await logAdminAction(req.adminEmail, 'view_connections', {
      provider,
      status,
      filter,
      total,
    });

    res.json({
      connections: paginatedConnections,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ message: 'Failed to fetch connections' });
  }
});

// POST /api/admin/connections/:id/revoke - Revoke connection
const revokeConnectionSchema = z.object({
  provider: z.enum(['teller', 'snaptrade']),
});

router.post('/connections/:id/revoke', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { id } = req.params;
    const parseResult = revokeConnectionSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Invalid provider',
        errors: parseResult.error.errors,
      });
    }

    const { provider } = parseResult.data;

    if (provider === 'teller') {
      const [connection] = await db
        .select()
        .from(connectedAccounts)
        .where(eq(connectedAccounts.id, parseInt(id)));

      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      await db
        .update(connectedAccounts)
        .set({
          status: 'disconnected',
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(connectedAccounts.id, parseInt(id)));

      await logAdminAction(
        req.adminEmail,
        'revoke_teller_connection',
        { connectionId: id, userId: connection.userId },
        connection.userId
      );
    } else if (provider === 'snaptrade') {
      const [connection] = await db
        .select()
        .from(snaptradeConnections)
        .where(eq(snaptradeConnections.id, parseInt(id)));

      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      await db
        .update(snaptradeConnections)
        .set({
          disabled: true,
          updatedAt: new Date(),
        })
        .where(eq(snaptradeConnections.id, parseInt(id)));

      await logAdminAction(
        req.adminEmail,
        'revoke_snaptrade_connection',
        { connectionId: id, userId: connection.flintUserId },
        connection.flintUserId
      );
    }

    res.json({ message: 'Connection revoked successfully' });
  } catch (error) {
    console.error('Error revoking connection:', error);
    res.status(500).json({ message: 'Failed to revoke connection' });
  }
});

// POST /api/admin/connections/:id/resync - Force resync connection
router.post('/connections/:id/resync', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { provider } = req.body;

    if (provider === 'teller') {
      const [connection] = await db
        .select()
        .from(connectedAccounts)
        .where(eq(connectedAccounts.id, parseInt(id)));

      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      await db
        .update(connectedAccounts)
        .set({
          lastSynced: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(connectedAccounts.id, parseInt(id)));

      await logAdminAction(
        req.adminEmail,
        'resync_teller_connection',
        { connectionId: id },
        connection.userId
      );

      res.json({ message: 'Teller connection resynced successfully' });
    } else if (provider === 'snaptrade') {
      const [connection] = await db
        .select()
        .from(snaptradeConnections)
        .where(eq(snaptradeConnections.id, parseInt(id)));

      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      await db
        .update(snaptradeConnections)
        .set({
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(snaptradeConnections.id, parseInt(id)));

      await logAdminAction(
        req.adminEmail,
        'resync_snaptrade_connection',
        { connectionId: id },
        connection.flintUserId
      );

      res.json({ message: 'SnapTrade connection resynced successfully' });
    } else {
      res.status(400).json({ message: 'Invalid provider' });
    }
  } catch (error) {
    console.error('Error resyncing connection:', error);
    res.status(500).json({ message: 'Failed to resync connection' });
  }
});

// DELETE /api/admin/connections/:connectionId - Admin disconnect connection
router.delete('/connections/:connectionId', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { connectionId } = req.params;
    const { provider } = req.query;
    
    if (!provider || (provider !== 'teller' && provider !== 'snaptrade')) {
      return res.status(400).json({ message: 'Invalid or missing provider parameter' });
    }
    
    if (provider === 'teller') {
      // Disconnect Teller account
      const [connection] = await db
        .select()
        .from(connectedAccounts)
        .where(eq(connectedAccounts.id, parseInt(connectionId)));
      
      if (!connection) {
        return res.status(404).json({ message: 'Teller connection not found' });
      }
      
      await db
        .update(connectedAccounts)
        .set({ 
          status: 'disconnected',
          updatedAt: new Date()
        })
        .where(eq(connectedAccounts.id, parseInt(connectionId)));
      
      console.log('Admin disconnected Teller account', {
        adminEmail: req.adminEmail,
        connectionId,
        userId: connection.userId,
        provider: 'teller',
        institutionName: connection.institutionName
      });

      await logAdminAction(
        req.adminEmail,
        'disconnect_account',
        { 
          connectionId, 
          provider: 'teller',
          institutionName: connection.institutionName
        },
        connection.userId
      );
      
      return res.json({ success: true, message: 'Account disconnected successfully' });
    } 
    
    if (provider === 'snaptrade') {
      // Disconnect SnapTrade account
      const [connection] = await db
        .select()
        .from(snaptradeConnections)
        .where(eq(snaptradeConnections.id, parseInt(connectionId)));
      
      if (!connection) {
        return res.status(404).json({ message: 'SnapTrade connection not found' });
      }
      
      await db
        .update(snaptradeConnections)
        .set({ 
          disabled: true,
          updatedAt: new Date()
        })
        .where(eq(snaptradeConnections.id, parseInt(connectionId)));
      
      console.log('Admin disconnected SnapTrade account', {
        adminEmail: req.adminEmail,
        connectionId,
        userId: connection.flintUserId,
        provider: 'snaptrade',
        brokerageName: connection.brokerageName
      });

      await logAdminAction(
        req.adminEmail,
        'disconnect_account',
        { 
          connectionId, 
          provider: 'snaptrade',
          brokerageName: connection.brokerageName
        },
        connection.flintUserId
      );
      
      return res.json({ success: true, message: 'Account disconnected successfully' });
    }
    
    // Connection not found in either table
    return res.status(404).json({ message: 'Connection not found' });
    
  } catch (error) {
    console.error('Admin disconnect failed', { error });
    res.status(500).json({ message: 'Failed to disconnect account' });
  }
});

// ============================================================================
// FEATURE FLAGS
// ============================================================================

// GET /api/admin/feature-flags - Get all feature flags
router.get('/feature-flags', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const flags = await db
      .select()
      .from(featureFlags)
      .orderBy(featureFlags.key);

    await logAdminAction(req.adminEmail, 'view_feature_flags');

    res.json({ flags });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ message: 'Failed to fetch feature flags' });
  }
});

// PATCH /api/admin/feature-flags/:key - Update feature flag
const updateFeatureFlagSchema = z.object({
  enabled: z.boolean(),
  description: z.string().optional(),
});

router.patch('/feature-flags/:key', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const { key } = req.params;
    const parseResult = updateFeatureFlagSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Invalid data',
        errors: parseResult.error.errors,
      });
    }

    const { enabled, description } = parseResult.data;

    // Check if flag exists
    const [existingFlag] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, key));

    if (existingFlag) {
      // Update existing flag
      await db
        .update(featureFlags)
        .set({
          enabled,
          description: description || existingFlag.description,
          updatedBy: req.adminEmail,
          updatedAt: new Date(),
        })
        .where(eq(featureFlags.key, key));
    } else {
      // Create new flag
      await db
        .insert(featureFlags)
        .values({
          key,
          enabled,
          description: description || null,
          updatedBy: req.adminEmail,
        });
    }

    await logAdminAction(
      req.adminEmail,
      'update_feature_flag',
      { key, enabled, description }
    );

    res.json({
      message: 'Feature flag updated successfully',
      flag: { key, enabled, description },
    });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    res.status(500).json({ message: 'Failed to update feature flag' });
  }
});

// ============================================================================
// AUDIT LOGS
// ============================================================================

// GET /api/admin/audit-logs - Get audit logs with filtering
router.get('/audit-logs', isAuthenticated, requireAdmin(), async (req: any, res) => {
  try {
    const {
      page = '1',
      limit = '50',
      action,
      adminEmail,
      targetUserId,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let conditions = [];

    if (action) {
      conditions.push(eq(auditLogs.action, action as string));
    }

    if (adminEmail) {
      conditions.push(eq(auditLogs.adminEmail, adminEmail as string));
    }

    if (targetUserId) {
      conditions.push(eq(auditLogs.targetUserId, targetUserId as string));
    }

    if (startDate) {
      conditions.push(gte(auditLogs.timestamp, new Date(startDate as string)));
    }

    if (endDate) {
      conditions.push(lte(auditLogs.timestamp, new Date(endDate as string)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : sql`true`;

    const logs = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limitNum)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(whereClause);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

export default router;
