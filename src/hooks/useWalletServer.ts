import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DepositParams {
  amount: number;
  utrId: string;
  screenshotPath?: string;
}

interface WithdrawParams {
  amount: number;
}

interface AdminUpdateParams {
  targetUserId: string;
  amount: number;
  reason: string;
}

interface RedeemCodeParams {
  code: string;
}

interface SaveBankCardParams {
  accountHolderName: string;
  cardNumber: string;
  ifscCode: string;
  bankName: string;
}

interface WalletServerResponse {
  success?: boolean;
  error?: string;
  transactionId?: string;
  newBalance?: number;
  amount?: number;
  message?: string;
  bankCard?: {
    id: string;
    account_holder_name: string;
    card_number: string;
    ifsc_code: string;
    bank_name: string;
  };
}

export const useWalletServer = () => {
  const callWalletServer = async (payload: Record<string, unknown>): Promise<WalletServerResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('wallet-server', {
        body: payload,
      });

      // Handle FunctionsHttpError - parse the response body for actual error message
      if (error) {
        console.error('[useWalletServer] Error:', error);
        
        // Try to extract the actual error message from the response
        if (error.context?.body) {
          try {
            const errorBody = JSON.parse(error.context.body);
            if (errorBody?.error) {
              return { error: errorBody.error };
            }
          } catch {
            // Failed to parse, use default message
          }
        }
        
        return { error: error.message || 'Server error' };
      }

      // If data contains an error field, return it
      if (data?.error) {
        return { error: data.error };
      }

      return data as WalletServerResponse;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useWalletServer] Exception:', message);
      return { error: message };
    }
  };

  // Deposit request
  const requestDeposit = async (params: DepositParams): Promise<WalletServerResponse> => {
    const response = await callWalletServer({
      action: 'deposit',
      amount: params.amount,
      utrId: params.utrId,
      screenshotPath: params.screenshotPath,
    });

    if (response.error) {
      toast({ title: 'Error', description: response.error, variant: 'destructive' });
    } else if (response.success) {
      toast({ title: 'Deposit Submitted', description: response.message });
    }

    return response;
  };

  // Withdrawal request
  const requestWithdrawal = async (params: WithdrawParams): Promise<WalletServerResponse> => {
    const response = await callWalletServer({
      action: 'withdraw',
      amount: params.amount,
    });

    if (response.error) {
      toast({ title: 'Error', description: response.error, variant: 'destructive' });
    } else if (response.success) {
      toast({ title: 'Withdrawal Submitted', description: response.message });
    }

    return response;
  };

  // Admin wallet update
  const adminUpdateWallet = async (params: AdminUpdateParams): Promise<WalletServerResponse> => {
    const response = await callWalletServer({
      action: 'admin_update',
      targetUserId: params.targetUserId,
      amount: params.amount,
      reason: params.reason,
    });

    if (response.error) {
      toast({ title: 'Error', description: response.error, variant: 'destructive' });
    } else if (response.success) {
      toast({ title: 'Success', description: response.message });
    }

    return response;
  };

  // Redeem code
  const redeemCode = async (params: RedeemCodeParams): Promise<WalletServerResponse> => {
    const response = await callWalletServer({
      action: 'redeem_code',
      code: params.code,
    });

    if (response.error) {
      toast({ title: 'Error', description: response.error, variant: 'destructive' });
    } else if (response.success) {
      toast({ title: '🎉 Code Redeemed!', description: response.message });
    }

    return response;
  };

  // Save bank card
  const saveBankCard = async (params: SaveBankCardParams): Promise<WalletServerResponse> => {
    const response = await callWalletServer({
      action: 'save_bank_card',
      bankCard: {
        accountHolderName: params.accountHolderName,
        cardNumber: params.cardNumber,
        ifscCode: params.ifscCode,
        bankName: params.bankName,
      },
    });

    if (response.error) {
      toast({ title: 'Error', description: response.error, variant: 'destructive' });
    } else if (response.success) {
      toast({ title: '✅ Bank Details Saved', description: response.message });
    }

    return response;
  };

  return {
    requestDeposit,
    requestWithdrawal,
    adminUpdateWallet,
    redeemCode,
    saveBankCard,
  };
};
