'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Zap,
  Crown,
  Mic,
  Info,
  Loader
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileTabs } from './profile-tabs';
import { toast } from 'sonner';
import { useAppContext } from '@/contexts/app';
import { clientGet } from '@/lib/client-request';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface CreditTransaction {
  id: number;
  userId: number;
  pointsChange: number;
  pointsBalance: number;
  businessType: string;
  businessNo: string;
  createTime: string;
  updateTime: string;
}

interface OrderEntity {
  id: number;
  orderNo: string;
  userId: number;
  amount: number;
  status: string;
  payType: string;
  payTime?: string;
  payTradeNo?: string;
  orderDescription?: string;
  orderType: string;
  duration?: string;
  planCode?: string;
  giftPoints?: number;
  days?: number;
  numbers?: number;
  createTime: string;
  updateTime: string;
}

export function Profile() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { user: contextUser, fetchUserInfoFromBackend, setShowSignModal } = useAppContext();
  const [billingPeriod, setBillingPeriod] = useState<'yearly' | 'monthly'>('yearly');

  // 从Context获取用户信息
  const [userInfo, setUserInfo] = useState<any>(null);
  // 账户信息（积分、会员等）
  const [accountInfo, setAccountInfo] = useState<any>(null);
  // 登录状态检查
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 检查登录状态 - 改为使用 NextAuth session
  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (!session) {
      // 未登录，重定向到首页并打开登录弹窗
      router.push('/?login=required');
      return;
    }

    setIsLoggedIn(true);
    setIsCheckingAuth(false);
  }, [session, status, router]);

  // 进入页面时刷新用户信息
  useEffect(() => {
    if (!isLoggedIn) return;

    if (fetchUserInfoFromBackend) {
      fetchUserInfoFromBackend();
    }
  }, [isLoggedIn, fetchUserInfoFromBackend]);

  useEffect(() => {
    if (contextUser) {
      setUserInfo(contextUser);
    }
  }, [contextUser]);

  // 获取账户信息 - 从 Supabase 数据库查询
  useEffect(() => {
    const fetchAccountInfo = async () => {
      if (!session?.user) {
        return;
      }

      try {
        console.log('[Profile] Fetching account info from database...');
        const response = await fetch('/api/user/account');
        const data = await response.json();

        if (data.code === 1000 && data.data) {
          console.log('[Profile] Account info loaded:', data.data);
          setAccountInfo(data.data);
        } else {
          console.error('[Profile] Failed to fetch account info:', data);
          // 使用默认值
          setAccountInfo({
            availablePoints: contextUser?.credits || 0,
            subscriptionStatus: 'inactive',
            subscriptionPlanCode: null,
            subscriptionPlanName: null,
            subscriptionEndTime: null,
          });
        }
      } catch (error) {
        console.error('[Profile] Failed to fetch account info:', error);
        // 使用默认值
        setAccountInfo({
          availablePoints: contextUser?.credits || 0,
          subscriptionStatus: 'inactive',
          subscriptionPlanCode: null,
          subscriptionPlanName: null,
          subscriptionEndTime: null,
        });
      }
    };

    fetchAccountInfo();
  }, [session, contextUser]);

  // 获取用户手机号
  const getUserPhone = () => {
    const phone = userInfo?.phone || userInfo?.mobile || userInfo?.email || '';
    if (phone === 'Loading...' || phone === '加载中...' || phone === 'loading') {
      if (userInfo?.id) {
        return `User ${String(userInfo.id).slice(-4)}`;
      }
      return t('user.anonymous');
    }
    return phone;
  };

  // 获取会员名称
  const getMemberName = () => {
    if (!accountInfo) {
      return t('user.no_member');
    }

    const status = accountInfo.subscriptionStatus;
    const planCode = accountInfo.subscriptionPlanCode;

    if (status && status.toUpperCase() === 'ACTIVE' && planCode) {
      // 根据 planCode 返回对应的会员名称
      if (planCode === 'normal_vip_2') {
        return t('user.basic_member');
      } else if (planCode === 'normal_vip_3') {
        return t('user.professional_member');
      }
      // 如果有其他 planCode，返回 planName 或默认会员名称
      return accountInfo.subscriptionPlanName || t('user.member');
    }
    return t('user.no_member');
  };

  // 用户数据
  const user = {
    id: userInfo?.id || '',
    phone: getUserPhone(),
    credits: accountInfo?.availablePoints || 0,
    memberType: accountInfo?.subscriptionStatus?.toUpperCase() === 'ACTIVE' ? 'member' : 'no_member',
    memberName: getMemberName(),
    subscriptionEndTime: accountInfo?.subscriptionEndTime,
    basicVoiceCloneCount: 0,
    advancedVoiceCloneCount: 0
  };

  const [activeTab, setActiveTab] = useState('credits');
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [memberOrders, setMemberOrders] = useState<OrderEntity[]>([]);
  const [pointsOrders, setPointsOrders] = useState<OrderEntity[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ordersCurrentPage, setOrdersCurrentPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);

  // 获取积分交易记录 - 从 Supabase 数据库查询
  const fetchTransactions = useCallback(async (page: number = 1) => {
    if (!session?.user) {
      return;
    }

    try {
      setLoadingTransactions(true);
      console.log('[Profile] Fetching transactions, page:', page);

      const response = await fetch(`/api/payment/points/transactions?page=${page}&pageSize=10`);
      const data = await response.json();

      if (data.code === 1000 && data.data) {
        const list = data.data.list || [];
        const pagination = data.data.pagination || {};
        const total = Number(pagination.total || 0);
        const pageSize = Number(pagination.size || 10);

        let estimatedTotalPages = 1;
        if (total > 0) {
          estimatedTotalPages = Math.ceil(total / pageSize);
        }

        console.log('[Profile] Transactions loaded:', list.length, 'items, total pages:', estimatedTotalPages);
        setTransactions(list);
        setCurrentPage(page);
        setTotalPages(estimatedTotalPages);
      } else {
        console.error('[Profile] Failed to fetch transactions:', data);
        setTransactions([]);
        setCurrentPage(page);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('[Profile] Failed to fetch transactions:', error);
      setTransactions([]);
      setCurrentPage(page);
      setTotalPages(1);
    } finally {
      setLoadingTransactions(false);
    }
  }, [session?.user]);

  // 获取所有订单
  const fetchAllOrders = async (page: number = 1) => {
    try {
      setLoadingTransactions(true);

      // 使用auth.ts提供的getToken()函数，会自动验证token完整性
      const { getToken } = await import('@/lib/auth');
      const token = getToken();

      if (!token) {
        setMemberOrders([]);
        setPointsOrders([]);
        return;
      }

      const result = await clientGet(`/api/payment/order/my/list?page=${page}&size=20`);

      if (result.code === 1000 && result.data) {

        let orders = [];
        let total = 0;

        if (result.data.list && result.data.pagination) {
          orders = result.data.list;
          total = result.data.pagination.total || 0;
          const pageSize = result.data.pagination.size || 20;
          const totalPages = Math.max(1, Math.ceil(total / pageSize));
          setOrdersCurrentPage(result.data.pagination.page || page);
          setOrdersTotalPages(totalPages);
        } else if (result.data.records) {
          orders = result.data.records;
          total = result.data.total || 0;
          const totalPages = Math.max(1, Math.ceil(total / 20));
          setOrdersCurrentPage(page);
          setOrdersTotalPages(totalPages);
        } else if (Array.isArray(result.data)) {
          orders = result.data;
          setOrdersCurrentPage(page);
          setOrdersTotalPages(1);
        }

        // Filter orders by type
        const memberFiltered = orders.filter((order: OrderEntity) => {
          const type = (order.orderType || '').toLowerCase();
          return type === 'subscription' || type === 'member' || type === 'vip';
        });

        const pointsFiltered = orders.filter((order: OrderEntity) => {
          const type = (order.orderType || '').toLowerCase();
          return type === 'point' || type === 'points' || type === 'credit';
        });

        setMemberOrders(memberFiltered);
        setPointsOrders(pointsFiltered);
      }
    } catch (error) {
      console.error('[Profile] Failed to fetch orders:', error);
      setMemberOrders([]);
      setPointsOrders([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // 根据 activeTab 的变化加载对应数据
  useEffect(() => {
    if (!isLoggedIn) return;

    if (activeTab === 'credits') {
      fetchTransactions(currentPage);
    } else if (activeTab === 'member-orders' || activeTab === 'points-orders') {
      fetchAllOrders(ordersCurrentPage);
    }
  }, [activeTab, currentPage, ordersCurrentPage, isLoggedIn, fetchTransactions]);

  // 正在检查登录状态或未登录 - 显示加载中（因为会立即重定向）
  if (isCheckingAuth || !isLoggedIn) {
    return (
      <div className="container md:max-w-7xl py-8 mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container md:max-w-7xl py-8 mx-auto">
      <div className="relative space-y-6 p-4">
        {/* 用户信息卡片 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{user.phone}</h2>
                  <p className="text-sm text-muted-foreground">
                    {user.memberName}
                  </p>
                  {user.subscriptionEndTime && user.memberType === 'member' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('user.valid_until')}: {new Date(user.subscriptionEndTime).toLocaleDateString(locale)}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="default"
                className="shrink-0"
                onClick={() => window.location.href = '/pricing'}
              >
                <Crown className="h-4 w-4 mr-2" />
                {t('user.upgrade_membership')}
              </Button>
            </div>

            {/* 积分信息 */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    <span className="font-medium">{t('user.credits')}</span>
                    <span className="text-2xl font-bold">{user.credits}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => window.location.href = '/pricing'}
                >
                  {t('user.recharge_credits')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 积分收支明细 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {t('user.transaction_history')}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      if (activeTab === 'credits') {
                        fetchTransactions(1);
                      } else if (activeTab === 'member-orders' || activeTab === 'points-orders') {
                        fetchAllOrders(1);
                      }
                    }}
                    disabled={loadingTransactions}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loadingTransactions ? "animate-spin" : ""}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                  </Button>
                </CardTitle>
                <CardDescription>{t('user.transaction_history_desc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ProfileTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              transactions={transactions}
              memberOrders={memberOrders}
              pointsOrders={pointsOrders}
              loading={loadingTransactions}
              currentPage={activeTab === 'credits' ? currentPage : ordersCurrentPage}
              totalPages={activeTab === 'credits' ? totalPages : ordersTotalPages}
              onPageChange={(page) => {
                if (activeTab === 'credits') {
                  setCurrentPage(page);
                  fetchTransactions(page);
                } else {
                  setOrdersCurrentPage(page);
                  fetchAllOrders(page);
                }
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
