import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Save, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your favorite movie?",
  "What was your childhood nickname?",
  "What is the name of your favorite teacher?",
  "What was the make of your first car?",
  "What is your favorite sports team?",
];

interface SecurityQuestionFormProps {
  userId: string;
  currentQuestion: string | null;
  hasAnswer: boolean;
  onUpdate: () => void;
}

const SecurityQuestionForm = ({ userId, currentQuestion, hasAnswer, onUpdate }: SecurityQuestionFormProps) => {
  const [selectedQuestion, setSelectedQuestion] = useState(currentQuestion || '');
  const [answer, setAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedQuestion) {
      toast({ title: 'Error', description: 'Please select a security question', variant: 'destructive' });
      return;
    }

    if (!answer.trim() || answer.trim().length < 2) {
      toast({ title: 'Error', description: 'Please enter a valid answer (at least 2 characters)', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ 
        security_question: selectedQuestion,
        security_answer: answer.trim().toLowerCase() // Store lowercase for case-insensitive matching
      })
      .eq('id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Security question updated successfully!' });
      setAnswer('');
      onUpdate();
    }

    setIsSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Security Question
          </CardTitle>
          <CardDescription>
            {hasAnswer 
              ? 'Your security question is set. You can update it anytime.'
              : 'Set a security question to enable password recovery.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasAnswer && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500">Password recovery is enabled</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Security Question</Label>
            <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
              <SelectTrigger>
                <SelectValue placeholder="Select a security question" />
              </SelectTrigger>
              <SelectContent>
                {SECURITY_QUESTIONS.map((question) => (
                  <SelectItem key={question} value={question}>
                    {question}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Your Answer</Label>
            <div className="relative">
              <Input
                type={showAnswer ? 'text' : 'password'}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={hasAnswer ? 'Enter new answer to update' : 'Enter your answer'}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowAnswer(!showAnswer)}
              >
                {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Remember this answer exactly - it will be used to recover your password.
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={isSaving || !selectedQuestion || !answer.trim()}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {hasAnswer ? 'Update Security Question' : 'Set Security Question'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SecurityQuestionForm;
