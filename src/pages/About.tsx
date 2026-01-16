import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Video, Swords, Flame, Users, User, Disc } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const features = [
    { icon: Video, label: 'Short dance videos' },
    { icon: Swords, label: 'Dance battles with community voting' },
    { icon: Flame, label: 'Trending dance challenges' },
    { icon: Users, label: 'Duets & cyphers' },
    { icon: User, label: 'Creator profiles' },
    { icon: Disc, label: 'Discover new dance styles' },
  ];

  return (
    <Dialog open={true} onOpenChange={handleBack}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[600px] max-h-[90vh] bg-card border-border rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleBack} className="rounded-full -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <DialogTitle className="text-xl font-bold">About Muv'it</DialogTitle>
            <div className="w-9" />
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-80px)]">
          <div className="px-6 py-6 space-y-8">
            {/* Hero Section */}
            <div className="space-y-4">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg mx-auto">
                  <span className="text-3xl font-bold text-primary-foreground">M</span>
                </div>
                <h2 className="text-2xl font-bold">Muv'it</h2>
                <p className="text-primary font-medium">Dance-first short video platform</p>
              </div>
              
              <div className="space-y-4 text-foreground/90 leading-relaxed">
                <p className="text-center text-lg">
                  Built for movers, creators, and rhythm lovers.
                </p>
                <p>
                  From street styles to studio choreography, Muv'it gives dancers a space to express, connect, and go viral through movement.
                </p>
                <p>
                  Post short dance videos, join challenges, battle other dancers, and collaborate through duets and cyphers.
                </p>
                <div className="bg-secondary/50 rounded-xl p-4 text-center space-y-2">
                  <p className="font-medium text-foreground">No clutter. No noise.</p>
                  <p className="text-xl font-bold text-primary">Just movement.</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Features</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tagline */}
            <div className="text-center py-6 border-t border-border">
              <p className="text-lg font-bold text-foreground">
                Don't scroll it. <span className="text-primary">Muv'it.</span>
              </p>
            </div>

            {/* FAQ Section */}
            <div className="border-t border-border pt-8">
              <h2 className="text-xl font-bold mb-6">Frequently Asked Questions</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">1. What is Muv'it?</h3>
                  <p className="text-foreground/90 text-sm">
                    Muv'it is a dance-first social video platform where users can record, edit, and share short dance videos with the world. You can showcase your moves, join challenges, or connect with other dancers.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">2. How do I create an account?</h3>
                  <p className="text-foreground/90 text-sm">
                    Download the Muv'it app, tap "Sign Up", and register using your email, phone number, or social media account. Once verified, you can start creating and sharing videos instantly.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">3. Is Muv'it free to use?</h3>
                  <p className="text-foreground/90 text-sm">
                    Yes. Muv'it is free to download and use. Some optional features, such as verified badges or promoted content, may require in-app purchases or subscriptions.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">4. Who can use Muv'it?</h3>
                  <p className="text-foreground/90 text-sm">
                    Anyone 13 years or older can use the app. If you're under 18, you should have permission from a parent or guardian.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">5. What kind of content can I post?</h3>
                  <p className="text-foreground/90 text-sm">
                    You can post original dance videos that are creative, entertaining, or educational. However, do not post content that promotes hate, violence, or discrimination, contains nudity or illegal activity, or infringes on others' rights.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">6. Who owns the videos I upload?</h3>
                  <p className="text-foreground/90 text-sm">
                    You own the rights to your content. By posting on Muv'it, you give us permission to display, promote, and distribute your videos within the app or through official marketing — always with credit to you.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">7. How can I report abuse?</h3>
                  <p className="text-foreground/90 text-sm">
                    Tap the "Report" button on any video or profile that breaks our guidelines, or contact our support team at{' '}
                    <a href="mailto:support@muvit.app" className="text-primary hover:underline">support@muvit.app</a>.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">8. How do I get verified?</h3>
                  <p className="text-foreground/90 text-sm">
                    Verification is for notable creators, brands, and public figures. You can apply through Settings → Apply for Verification.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">9. How can I contact Muv'it?</h3>
                  <p className="text-foreground/90 text-sm">
                    Email us at{' '}
                    <a href="mailto:support@muvit.app" className="text-primary hover:underline">support@muvit.app</a> or <a href="mailto:Info@semogroup.com" className="text-primary hover:underline">Info@semogroup.com</a>, or use the in-app Help Center.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default About;
