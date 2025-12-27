import { useState } from 'react';
import { Sparkles, TrendingUp, Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface AIAnalysisProps {
  collection: any[];
}

type AnalysisType = 'overview' | 'value' | 'taste';

export function AIAnalysis({ collection }: AIAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<AnalysisType | null>(null);

  const analyzeCollection = async (type: AnalysisType) => {
    if (collection.length === 0) {
      toast.error('No CDs in collection to analyze');
      return;
    }

    setLoading(true);
    setActiveType(type);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-collection', {
        body: { collection, analysisType: type }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze collection');
    } finally {
      setLoading(false);
    }
  };

  const analysisButtons = [
    { type: 'overview' as AnalysisType, icon: Sparkles, label: 'Collection Overview', description: 'Get a comprehensive analysis' },
    { type: 'value' as AnalysisType, icon: TrendingUp, label: 'Value Analysis', description: 'Discover hidden gems' },
    { type: 'taste' as AnalysisType, icon: Heart, label: 'Taste Profile', description: 'Understand your style' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-display tracking-wide text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" />
            AI ANALYSIS
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Let AI analyze your CD collection
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {analysisButtons.map(({ type, icon: Icon, label, description }) => (
          <button
            key={type}
            onClick={() => analyzeCollection(type)}
            disabled={loading}
            className={`stat-card text-left transition-all ${
              activeType === type ? 'border-primary/50 shadow-glow' : ''
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                activeType === type ? 'bg-primary text-primary-foreground' : 'bg-primary/10'
              }`}>
                <Icon className={`w-5 h-5 ${activeType === type ? '' : 'text-primary'}`} />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground">Analyzing your collection...</p>
          </div>
        </div>
      )}

      {analysis && !loading && (
        <div className="stat-card animate-fade-in">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-display text-primary mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-display text-foreground mt-6 mb-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">{children}</h3>,
                p: ({ children }) => <p className="text-muted-foreground leading-relaxed mb-3">{children}</p>,
                strong: ({ children }) => <strong className="text-primary font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-muted-foreground mb-4">{children}</ol>,
                li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
              }}
            >
              {analysis}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
