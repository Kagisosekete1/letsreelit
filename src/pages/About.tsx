import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">About Reel'it</h1>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-73px)]">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">About Reel'it</h2>
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
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions (FAQ)</h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">1. What is Reel'it?</h3>
                <p className="text-foreground/90">
                  Reel'it is a creative social video platform where users can record, edit, and share short videos with the world. You can showcase your talents, join challenges, or simply connect with other creators.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">2. How do I create an account?</h3>
                <p className="text-foreground/90">
                  Download the Reel'it app, tap "Sign Up", and register using your email, phone number, or social media account. Once verified, you can start creating and sharing videos instantly.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">3. Is Reel'it free to use?</h3>
                <p className="text-foreground/90">
                  Yes. Reel'it is free to download and use. Some optional features, such as verified badges or promoted content, may require in-app purchases or subscriptions.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">4. Who can use Reel'it?</h3>
                <p className="text-foreground/90">
                  Anyone 13 years or older can use the app. If you're under 18, you should have permission from a parent or guardian.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">5. What kind of content can I post?</h3>
                <p className="text-foreground/90">
                  You can post original videos that are creative, entertaining, or educational. However, do not post content that:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-foreground/90">
                  <li>Promotes hate, violence, or discrimination.</li>
                  <li>Contains nudity, explicit acts, or illegal activity.</li>
                  <li>Infringes on someone else's music, video, or brand.</li>
                </ul>
                <p className="text-foreground/90">
                  We want Reel'it to stay fun, safe, and inspiring for everyone.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">6. Who owns the videos I upload?</h3>
                <p className="text-foreground/90">
                  You own the rights to your content. By posting on Reel'it, you give us permission to display, promote, and distribute your videos within the app or through official marketing — always with credit to you.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">7. Can my account be suspended or removed?</h3>
                <p className="text-foreground/90">
                  Yes. If you violate our Terms of Use (for example, by posting harmful content or impersonating someone), your account may be suspended or permanently banned.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">8. How can I report abuse or inappropriate content?</h3>
                <p className="text-foreground/90">
                  Tap the "Report" button on any video or profile that breaks our guidelines, or contact our support team directly at{' '}
                  <a href="mailto:support@se-mogroup.com" className="text-primary hover:underline">support@se-mogroup.com</a>.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">9. How does Reel'it protect my privacy?</h3>
                <p className="text-foreground/90">
                  We take privacy seriously. Your personal data is kept secure and is never sold to third parties. You can manage your privacy settings in your profile under Settings → Privacy Controls.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">10. Can I delete my account?</h3>
                <p className="text-foreground/90">
                  Yes. You can delete your account anytime under Settings → Account Information → Delete Account. Once deleted, your profile and all uploaded content will be permanently removed.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">11. How do I get verified?</h3>
                <p className="text-foreground/90">
                  Verification is for notable creators, brands, and public figures. You can apply through Settings → Apply for Verification, and our team will review your request.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">12. How do creators get featured on Reel'it?</h3>
                <p className="text-foreground/90">
                  We spotlight creative, original, and positive content. Stay active, engage your audience, and follow community guidelines — the more authentic your content, the higher your chances.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">13. What should I do if someone copies my video?</h3>
                <p className="text-foreground/90">
                  If someone uses your video without permission, report it immediately through the app or email{' '}
                  <a href="mailto:support@se-mogroup.com" className="text-primary hover:underline">support@se-mogroup.com</a> with proof of ownership. We'll investigate copyright issues quickly.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">14. Where can I read the full Terms of Use and Privacy Policy?</h3>
                <p className="text-foreground/90">
                  You can find both documents under Settings → Legal or visit our official website{' '}
                  <a href="http://www.se-mogroup.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">www.se-mogroup.com</a>.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">15. How can I contact Reel'It?</h3>
                <p className="text-foreground/90">
                  Email us anytime at{' '}
                  <a href="mailto:info@se-mogroup.com" className="text-primary hover:underline">info@se-mogroup.com</a> or use the in-app Help Center → Contact Support option.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default About;
