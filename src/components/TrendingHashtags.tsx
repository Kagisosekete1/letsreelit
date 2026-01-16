import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TrendingHashtag {
  hashtag: string;
  usage_count: number;
}

interface TrendingHashtagsProps {
  className?: string;
  showHeader?: boolean;
  limit?: number;
}

const TrendingHashtags: React.FC<TrendingHashtagsProps> = ({
  className = '',
  showHeader = true,
  limit = 10,
}) => {
  const navigate = useNavigate();
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingHashtags();
  }, []);

  const fetchTrendingHashtags = async () => {
    // Extract hashtags from reels descriptions - count unique occurrences per reel
    const { data: reels } = await supabase
      .from('reels')
      .select('id, description, title')
      .not('description', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);

    if (reels) {
      const hashtagCounts: Record<string, number> = {};
      
      reels.forEach(reel => {
        // Combine title and description
        const text = `${reel.title || ''} ${reel.description || ''}`;
        const matches = text.match(/#\w+/g) || [];
        
        // Use Set to count unique hashtags per reel (no duplicates from same reel)
        const uniqueTagsInReel = new Set(matches.map(tag => tag.slice(1).toLowerCase()));
        
        uniqueTagsInReel.forEach(cleanTag => {
          hashtagCounts[cleanTag] = (hashtagCounts[cleanTag] || 0) + 1;
        });
      });

      const sortedTags = Object.entries(hashtagCounts)
        .map(([hashtag, usage_count]) => ({ hashtag, usage_count }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, limit);

      setHashtags(sortedTags);
    }
    setLoading(false);
  };

  const handleHashtagClick = (hashtag: string) => {
    navigate(`/search?hashtag=${encodeURIComponent(hashtag)}`);
  };

  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        {showHeader && (
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Trending Hashtags</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 w-20 bg-secondary rounded-full animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (hashtags.length === 0) return null;

  return (
    <div className={`${className}`}>
      {showHeader && (
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Trending Hashtags</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {hashtags.map((tag, index) => (
          <button
            key={tag.hashtag}
            onClick={() => handleHashtagClick(tag.hashtag)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-full text-sm transition-colors"
          >
            <Hash className="w-3 h-3 text-primary" />
            <span className="font-medium">{tag.hashtag}</span>
            <span className="text-xs text-muted-foreground ml-1">
              {formatCount(tag.usage_count)}
            </span>
            {index === 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                🔥
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TrendingHashtags;
