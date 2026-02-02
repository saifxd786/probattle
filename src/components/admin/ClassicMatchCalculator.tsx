import { useState, useEffect } from 'react';
import { Calculator, Users, Trophy, Coins, TrendingUp, Sparkles, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface CalculatedPrizes {
  entryFee: number;
  prizePool: number;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  perKill: number;
  platformProfit: number;
  profitPercentage: number;
}

interface ClassicMatchCalculatorProps {
  onApplySettings?: (settings: {
    entryFee: number;
    prizePool: number;
    firstPlace: number;
    secondPlace: number;
    thirdPlace: number;
    perKill: number;
    maxSlots: number;
  }) => void;
}

const ClassicMatchCalculator = ({ onApplySettings }: ClassicMatchCalculatorProps) => {
  const [teamMode, setTeamMode] = useState<'solo' | 'duo' | 'squad'>('solo');
  const [maxSlots, setMaxSlots] = useState(100);
  const [entryFee, setEntryFee] = useState(30);
  const [profitMargin, setProfitMargin] = useState([15]); // 15% default profit margin
  const [calculated, setCalculated] = useState<CalculatedPrizes | null>(null);

  // Calculate based on team mode
  const getPlayersPerTeam = () => {
    switch (teamMode) {
      case 'solo': return 1;
      case 'duo': return 2;
      case 'squad': return 4;
      default: return 1;
    }
  };

  const getMaxTeams = () => {
    switch (teamMode) {
      case 'solo': return 100;
      case 'duo': return 50;
      case 'squad': return 25;
      default: return 100;
    }
  };

  const getTotalPlayers = () => {
    const playersPerTeam = getPlayersPerTeam();
    return Math.min(maxSlots, getMaxTeams() * playersPerTeam);
  };

  const calculatePrizes = () => {
    const totalPlayers = getTotalPlayers();
    const totalRevenue = entryFee * totalPlayers;
    const profitAmount = Math.floor((totalRevenue * profitMargin[0]) / 100);
    const prizePool = totalRevenue - profitAmount;

    // Smart prize distribution based on team mode
    let firstPlace: number, secondPlace: number, thirdPlace: number, perKill: number;

    if (teamMode === 'solo') {
      // Solo: More kills expected, lower per-kill reward
      // Typical distribution: 40% 1st, 25% 2nd, 15% 3rd, 20% kills
      const killPool = Math.floor(prizePool * 0.20);
      const placePool = prizePool - killPool;
      
      firstPlace = Math.floor(placePool * 0.50);
      secondPlace = Math.floor(placePool * 0.30);
      thirdPlace = Math.floor(placePool * 0.20);
      
      // Estimate 20-30 total kills in a match
      const estimatedKills = 25;
      perKill = Math.max(1, Math.floor(killPool / estimatedKills));
    } else if (teamMode === 'duo') {
      // Duo: Medium kills, balanced distribution
      const killPool = Math.floor(prizePool * 0.25);
      const placePool = prizePool - killPool;
      
      firstPlace = Math.floor(placePool * 0.50);
      secondPlace = Math.floor(placePool * 0.30);
      thirdPlace = Math.floor(placePool * 0.20);
      
      const estimatedKills = 35;
      perKill = Math.max(1, Math.floor(killPool / estimatedKills));
    } else {
      // Squad: More kills, higher per-kill reward
      const killPool = Math.floor(prizePool * 0.30);
      const placePool = prizePool - killPool;
      
      firstPlace = Math.floor(placePool * 0.50);
      secondPlace = Math.floor(placePool * 0.30);
      thirdPlace = Math.floor(placePool * 0.20);
      
      const estimatedKills = 45;
      perKill = Math.max(1, Math.floor(killPool / estimatedKills));
    }

    setCalculated({
      entryFee,
      prizePool,
      firstPlace,
      secondPlace,
      thirdPlace,
      perKill,
      platformProfit: profitAmount,
      profitPercentage: profitMargin[0],
    });
  };

  useEffect(() => {
    calculatePrizes();
  }, [teamMode, maxSlots, entryFee, profitMargin]);

  const handleApply = () => {
    if (calculated && onApplySettings) {
      onApplySettings({
        entryFee: calculated.entryFee,
        prizePool: calculated.prizePool,
        firstPlace: calculated.firstPlace,
        secondPlace: calculated.secondPlace,
        thirdPlace: calculated.thirdPlace,
        perKill: calculated.perKill,
        maxSlots: getTotalPlayers(),
      });
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  return (
    <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          Match Profit Calculator
          <Badge variant="outline" className="ml-auto text-xs bg-cyan-500/10 border-cyan-500/30">
            AI Guide
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Team Mode</Label>
            <Select value={teamMode} onValueChange={(v) => setTeamMode(v as any)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">Solo (100 players)</SelectItem>
                <SelectItem value="duo">Duo (50 teams)</SelectItem>
                <SelectItem value="squad">Squad (25 teams)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Max Slots</Label>
            <Input
              type="number"
              value={maxSlots}
              onChange={(e) => setMaxSlots(Number(e.target.value))}
              className="h-9"
              max={getMaxTeams() * getPlayersPerTeam()}
            />
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Entry Fee (₹)</Label>
            <Input
              type="number"
              value={entryFee}
              onChange={(e) => setEntryFee(Number(e.target.value))}
              className="h-9"
            />
          </div>
        </div>

        {/* Profit Margin Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Platform Profit Margin</Label>
            <Badge variant="secondary" className="text-xs">
              {profitMargin[0]}%
            </Badge>
          </div>
          <Slider
            value={profitMargin}
            onValueChange={setProfitMargin}
            min={5}
            max={30}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>5% (Low)</span>
            <span>15% (Balanced)</span>
            <span>30% (High)</span>
          </div>
        </div>

        {/* Results Section */}
        {calculated && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            {/* Revenue Overview */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                  <Users className="w-3 h-3" />
                  Total Revenue
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(entryFee * getTotalPlayers())}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {getTotalPlayers()} players × ₹{entryFee}
                </p>
              </div>
              
              <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-1.5 text-[10px] text-green-400 mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Your Profit
                </div>
                <p className="text-sm font-semibold text-green-400">
                  {formatCurrency(calculated.platformProfit)}
                </p>
                <p className="text-[10px] text-green-400/70">
                  {calculated.profitPercentage}% margin
                </p>
              </div>
            </div>

            {/* Prize Distribution */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-2">
                <Trophy className="w-3.5 h-3.5" />
                Suggested Prize Distribution
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">🥇 1st</div>
                  <div className="text-sm font-bold text-amber-400">
                    {formatCurrency(calculated.firstPlace)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">🥈 2nd</div>
                  <div className="text-sm font-bold text-slate-300">
                    {formatCurrency(calculated.secondPlace)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">🥉 3rd</div>
                  <div className="text-sm font-bold text-amber-600">
                    {formatCurrency(calculated.thirdPlace)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">
                    <Target className="w-3 h-3 inline" /> Per Kill
                  </div>
                  <div className="text-sm font-bold text-red-400">
                    {formatCurrency(calculated.perKill)}
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-amber-500/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total Prize Pool:</span>
                  <span className="font-semibold text-amber-400">
                    {formatCurrency(calculated.prizePool)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-[10px] text-blue-400">
                💡 <strong>Tip:</strong> {teamMode === 'squad' 
                  ? 'Squad matches have more kills, so per-kill reward is higher to encourage aggressive play.'
                  : teamMode === 'duo'
                  ? 'Duo matches balance placement and kills - good for competitive play.'
                  : 'Solo matches reward survival - placement prizes are prioritized.'}
              </p>
            </div>

            {/* Apply Button */}
            {onApplySettings && (
              <Button 
                onClick={handleApply}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Apply These Settings
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClassicMatchCalculator;
