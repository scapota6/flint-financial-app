import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeftRight, ArrowDown, Bitcoin } from "lucide-react";

interface ActivityFeedProps {
  activities: any[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'trade_executed':
      case 'BUY':
        return { icon: Plus, color: 'bg-green-500' };
      case 'SELL':
        return { icon: Plus, color: 'bg-red-500' };
      case 'transfer_completed':
      case 'TRANSFER':
        return { icon: ArrowLeftRight, color: 'bg-blue-500' };
      case 'DEPOSIT':
        return { icon: ArrowDown, color: 'bg-green-600' };
      case 'WITHDRAWAL':
        return { icon: ArrowDown, color: 'bg-red-600' };
      case 'login':
        return { icon: ArrowDown, color: 'bg-blue-500' };
      default:
        return { icon: Bitcoin, color: 'bg-orange-500' };
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const safeActivities = Array.isArray(activities) ? activities : [];
  const displayActivities = safeActivities.slice(0, 10);

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
          <Button variant="ghost" className="text-gray-900 text-sm font-medium hover:bg-gray-100">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayActivities.slice(0, 10).map((activity, index) => {
            const { icon: Icon, color } = getActivityIcon(activity.action);
            const amount = activity.metadata?.amount || 0;
            const isTradeActivity = ['BUY', 'SELL', 'trade_executed'].includes(activity.action);
            
            return (
              <div
                key={index}
                className="activity-item flex items-center justify-between py-3 px-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 border border-gray-100"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-gray-900 font-medium text-sm truncate">{activity.description}</p>
                      <span className={`text-sm font-semibold ml-2 ${
                        amount >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(amount))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-600 font-medium">
                          {activity.action}
                        </span>
                        {isTradeActivity && activity.symbol && (
                          <>
                            <span>•</span>
                            <span className="text-gray-700 font-medium">{activity.symbol}</span>
                          </>
                        )}
                        {isTradeActivity && activity.quantity && (
                          <>
                            <span>•</span>
                            <span>{activity.quantity} shares</span>
                          </>
                        )}
                        {isTradeActivity && activity.price && (
                          <>
                            <span>•</span>
                            <span>@{formatCurrency(activity.price)}</span>
                          </>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs">
                        {new Date(activity.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {safeActivities.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Showing demo transaction history</p>
            <p className="text-gray-400 text-sm mt-1">Connect your brokerage account to see real trades</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
