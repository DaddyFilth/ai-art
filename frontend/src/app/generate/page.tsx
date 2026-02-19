'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';

export default function GeneratePage() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [style, setStyle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt required',
        description: 'Please enter a description for your artwork.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await api.post('/ai/generate', {
        prompt,
        negativePrompt,
        width,
        height,
        style,
      });

      const { asset, isAdminClaimed } = response.data.data;
      setGeneratedImage(asset.imageUrl);

      toast({
        title: 'Artwork generated!',
        description: isAdminClaimed
          ? 'This artwork is now owned by the platform (you still receive 10% of future sales).'
          : 'This artwork is now yours to keep or sell!',
      });
    } catch (error: any) {
      toast({
        title: 'Generation failed',
        description: error.response?.data?.error?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const stylePresets = [
    { id: '', name: 'Default' },
    { id: 'photorealistic', name: 'Photorealistic' },
    { id: 'anime', name: 'Anime' },
    { id: 'digital-art', name: 'Digital Art' },
    { id: 'oil-painting', name: 'Oil Painting' },
    { id: 'watercolor', name: 'Watercolor' },
    { id: '3d-render', name: '3D Render' },
    { id: 'sketch', name: 'Sketch' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generate Art</h1>
        <p className="text-muted-foreground">Create unique AI-powered artwork</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Generation Settings
            </CardTitle>
            <CardDescription>Configure your artwork parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Describe the artwork you want to create..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="negativePrompt">Negative Prompt (optional)</Label>
              <Input
                id="negativePrompt"
                placeholder="Things to avoid in the image..."
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label>Style</Label>
              <div className="flex flex-wrap gap-2">
                {stylePresets.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    variant={style === preset.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStyle(preset.id)}
                    disabled={isGenerating}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Width: {width}px</Label>
                <Slider
                  value={[width]}
                  onValueChange={(value) => setWidth(value[0])}
                  min={512}
                  max={2048}
                  step={64}
                  disabled={isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label>Height: {height}px</Label>
                <Slider
                  value={[height]}
                  onValueChange={(value) => setHeight(value[0])}
                  min={512}
                  max={2048}
                  step={64}
                  disabled={isGenerating}
                />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate (100 tokens)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Your generated artwork will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            {generatedImage ? (
              <div className="space-y-4">
                <img
                  src={generatedImage}
                  alt="Generated artwork"
                  className="w-full rounded-lg"
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    Download
                  </Button>
                  <Button className="flex-1">List for Sale</Button>
                </div>
              </div>
            ) : (
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Your artwork will appear here</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
