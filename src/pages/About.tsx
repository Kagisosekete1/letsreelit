import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[600px] max-h-[90vh] bg-card border-border rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">About Reel'it</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-80px)]">
          <div className="px-6 py-6 space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-bold">About Reel'it</h2>
              <div className="space-y-4 text-foreground/90 leading-relaxed">
                <p>
                  Reel'it is a video-only app made for dancers, creators, and movers who express themselves through rhythm and motion.
                  It's a space built strictly for short dance videos — where every reel is about movement, style, and creativity.
                </p>
                <p>
                  Whether you're a professional dancer or just love to groove, Reel'it gives you the spotlight to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Show off your best moves in short-form videos.</li>
                  <li>Join global dance trends and challenges.</li>
                  <li>Connect with other dancers from around the world.</li>
                  <li>Inspire and get inspired — one reel at a time.</li>
                </ul>
                <p className="font-semibold">
                  No talking, no skits — just pure dance energy.
                </p>
                <p>
                  On Reel'it, your moves do the talking. 🕺✨
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-8">
              <h2 className="text-xl font-bold mb-6">Frequently Asked Questions (FAQ)</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">1. What is Reel'it?</h3>
                  <p className="text-foreground/90 text-sm">
                    Reel'it is a creative social video platform where users can record, edit, and share short videos with the world. You can showcase your talents, join challenges, or simply connect with other creators.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">2. How do I create an account?</h3>
                  <p className="text-foreground/90 text-sm">
                    Download the Reel'it app, tap "Sign Up", and register using your email, phone number, or social media account. Once verified, you can start creating and sharing videos instantly.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">3. Is Reel'it free to use?</h3>
                  <p className="text-foreground/90 text-sm">
                    Yes. Reel'it is free to download and use. Some optional features, such as verified badges or promoted content, may require in-app purchases or subscriptions.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">4. Who can use Reel'it?</h3>
                  <p className="text-foreground/90 text-sm">
                    Anyone 13 years or older can use the app. If you're under 18, you should have permission from a parent or guardian.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">5. What kind of content can I post?</h3>
                  <p className="text-foreground/90 text-sm">
                    You can post original videos that are creative, entertaining, or educational. However, do not post content that promotes hate, violence, or discrimination, contains nudity or illegal activity, or infringes on others' rights.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">6. Who owns the videos I upload?</h3>
                  <p className="text-foreground/90 text-sm">
                    You own the rights to your content. By posting on Reel'it, you give us permission to display, promote, and distribute your videos within the app or through official marketing — always with credit to you.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">7. How can I report abuse?</h3>
                  <p className="text-foreground/90 text-sm">
                    Tap the "Report" button on any video or profile that breaks our guidelines, or contact our support team at{' '}
                    <a href="mailto:support@se-mogroup.com" className="text-primary hover:underline">support@se-mogroup.com</a>.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">8. How do I get verified?</h3>
                  <p className="text-foreground/90 text-sm">
                    Verification is for notable creators, brands, and public figures. You can apply through Settings → Apply for Verification.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold">9. How can I contact Reel'It?</h3>
                  <p className="text-foreground/90 text-sm">
                    Email us at{' '}
                    <a href="mailto:info@se-mogroup.com" className="text-primary hover:underline">info@se-mogroup.com</a> or use the in-app Help Center.
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