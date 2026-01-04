import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Plus, Copy, Check, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface RedeemCode {
  id: string;
  code: string;
  amount: number;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminRedeemCodes = () => {
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [codePrefix, setCodePrefix] = useState('PROMO');
  const [amount, setAmount] = useState('100');
  const [maxUses, setMaxUses] = useState('1');
  const [expiresInDays, setExpiresInDays] = useState('30');

  // Bulk form state
  const [bulkCount, setBulkCount] = useState('10');
  const [bulkPrefix, setBulkPrefix] = useState('BULK');
  const [bulkAmount, setBulkAmount] = useState('50');
  const [bulkMaxUses, setBulkMaxUses] = useState('1');
  const [bulkExpiresInDays, setBulkExpiresInDays] = useState('30');

  const fetchCodes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('redeem_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setCodes(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const generateCode = (prefix: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}${randomPart}`;
  };

  const handleCreateCode = async () => {
    if (!amount || Number(amount) <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    const code = generateCode(codePrefix);
    const expiresAt = expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000).toISOString() : null;

    const { error } = await supabase.from('redeem_codes').insert({
      code,
      amount: Number(amount),
      max_uses: Number(maxUses) || 1,
      expires_at: expiresAt,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Code ${code} created!` });
      setIsDialogOpen(false);
      fetchCodes();
    }
    setIsCreating(false);
  };

  const handleBulkCreate = async () => {
    const count = parseInt(bulkCount);
    if (isNaN(count) || count < 1 || count > 100) {
      toast({ title: 'Error', description: 'Please enter a valid count (1-100)', variant: 'destructive' });
      return;
    }

    if (!bulkAmount || Number(bulkAmount) <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    const expiresAt = bulkExpiresInDays ? new Date(Date.now() + Number(bulkExpiresInDays) * 24 * 60 * 60 * 1000).toISOString() : null;
    
    const codesToCreate = [];
    for (let i = 0; i < count; i++) {
      codesToCreate.push({
        code: generateCode(bulkPrefix),
        amount: Number(bulkAmount),
        max_uses: Number(bulkMaxUses) || 1,
        expires_at: expiresAt,
      });
    }

    const { error } = await supabase.from('redeem_codes').insert(codesToCreate);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `${count} codes created!` });
      setIsBulkOpen(false);
      fetchCodes();
    }
    setIsCreating(false);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('redeem_codes')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchCodes();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this code?')) return;

    const { error } = await supabase.from('redeem_codes').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Code deleted successfully' });
      fetchCodes();
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Ticket className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Redeem Codes</h1>
            <p className="text-sm text-muted-foreground">Generate promo codes for users</p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Bulk Create Dialog */}
          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Ticket className="w-4 h-4 mr-2" />
                Bulk Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Create Codes</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Number of Codes</Label>
                    <Input
                      type="number"
                      value={bulkCount}
                      onChange={(e) => setBulkCount(e.target.value)}
                      placeholder="10"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label>Code Prefix</Label>
                    <Input
                      value={bulkPrefix}
                      onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())}
                      placeholder="BULK"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      value={bulkAmount}
                      onChange={(e) => setBulkAmount(e.target.value)}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <Label>Max Uses Per Code</Label>
                    <Input
                      type="number"
                      value={bulkMaxUses}
                      onChange={(e) => setBulkMaxUses(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Expires In (Days)</Label>
                  <Input
                    type="number"
                    value={bulkExpiresInDays}
                    onChange={(e) => setBulkExpiresInDays(e.target.value)}
                    placeholder="30"
                  />
                </div>
                <div className="p-3 bg-muted rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    This will create {bulkCount || 0} unique codes with prefix "{bulkPrefix || 'BULK'}"
                  </p>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setIsBulkOpen(false)}>Cancel</Button>
                <Button onClick={handleBulkCreate} disabled={isCreating}>
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create {bulkCount || 0} Codes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Single Create Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Redeem Code</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Code Prefix</Label>
                  <Input
                    value={codePrefix}
                    onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                    placeholder="PROMO"
                  />
                </div>
                <div>
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label>Max Uses</Label>
                  <Input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label>Expires In (Days)</Label>
                  <Input
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="30"
                  />
                </div>
                <Button onClick={handleCreateCode} disabled={isCreating} className="w-full">
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Generate Code
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>All Codes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : codes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No codes created yet</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-primary/10 px-2 py-1 rounded text-sm font-mono">
                              {code.code}
                            </code>
                            <button
                              onClick={() => copyCode(code.code, code.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {copiedId === code.id ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-green-500">₹{code.amount}</TableCell>
                        <TableCell>
                          {code.current_uses}/{code.max_uses}
                        </TableCell>
                        <TableCell>
                          {code.expires_at
                            ? format(new Date(code.expires_at), 'MMM dd, yyyy')
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={code.is_active}
                            onCheckedChange={() => handleToggleActive(code.id, code.is_active)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(code.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminRedeemCodes;