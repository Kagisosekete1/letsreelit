import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <Dialog open={true} onOpenChange={handleBack}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[600px] max-h-[90vh] bg-card border-border rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleBack} className="rounded-full -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <DialogTitle className="text-xl font-bold">Terms & Policies</DialogTitle>
            <div className="w-9" />
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-80px)]">
          <div className="px-6 py-6 space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Muv'it – Terms of Use</h2>
              <p className="text-muted-foreground text-sm">Effective Date: January 2025</p>
              <p className="leading-relaxed text-sm">
                Welcome to Muv'it, a platform that allows users to create, share, and engage with short-form dance video content. By using our app, you agree to these Terms of Use. Please read them carefully.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">1. Acceptance of Terms</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                By accessing or using Muv'it, you agree to be bound by these Terms of Use and our Privacy Policy. If you do not agree, you may not use the app.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">2. Eligibility</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                You must be at least 13 years old to use Muv'it. By signing up, you confirm that you meet this age requirement.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">3. Account Registration</h3>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 text-sm">
                <li>Users must provide accurate information during registration.</li>
                <li>You are responsible for maintaining the security of your account credentials.</li>
                <li>You may not share your account with others or use someone else's account without permission.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">4. User Content & Monetization Eligibility</h3>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 text-sm">
                <li>You retain ownership of any videos, photos, or other content you post.</li>
                <li>By posting content on Muv'it, you grant us a non-exclusive, worldwide, royalty-free license to host, use, distribute, modify, and display your content within the app.</li>
                <li>You may not post content that is illegal, harmful, threatening, abusive, discriminatory, or infringes on others' rights.</li>
                <li><strong>Monetization Requirement:</strong> To be eligible for earnings, all content you post must be original and owned by you. You must hold full rights to any videos, music, choreography, or other creative elements used in your content.</li>
                <li><strong>Content Monitoring:</strong> Before any payments are processed, we monitor content for compliance. Any violation of content ownership rules will result in immediate deletion of pending payments and may lead to account suspension or termination.</li>
                <li><strong>Warning:</strong> Posting content you do not own the rights to is strictly prohibited. Users must be careful to only post content they have created or have explicit permission to use commercially.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">5. Prohibited Activities</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 text-sm">
                <li>Violate any applicable law or regulation.</li>
                <li>Post content that is offensive, explicit, or defamatory.</li>
                <li>Impersonate another person or entity.</li>
                <li>Hack, reverse engineer, or interfere with the app's functionality.</li>
                <li>Use the app for unauthorized commercial purposes.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">6. Intellectual Property</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                All content, design, logos, and trademarks on Muv'it are the property of Muv'it or its licensors. You may not use them without explicit permission.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">7. Termination</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                We may suspend or terminate your account at any time for violating these Terms of Use or for any activity that threatens the safety or integrity of the app.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">8. Disclaimers</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                Muv'it is provided "as is" and "as available." We do not guarantee uninterrupted access or that content posted will be error-free. You use the app at your own risk.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">9. Limitation of Liability</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                Muv'it is not liable for any direct, indirect, incidental, or consequential damages arising from your use of the app, including content posted by other users.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">10. Modifications</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                We may update these Terms of Use at any time. Changes will be posted within the app, and continued use of Muv'it constitutes acceptance of the updated terms.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">11. Governing Law</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                These Terms of Use are governed by the laws of South Africa. Any disputes will be resolved in the courts of this jurisdiction.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">12. Contact Us</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                For questions or concerns about these Terms of Use, please contact us at:
              </p>
              <p className="leading-relaxed text-foreground/90 text-sm">
                Email: <a href="mailto:Info@se-mogroup.com" className="text-primary hover:underline">Info@se-mogroup.com</a>
              </p>
              <p className="leading-relaxed text-foreground/90 text-sm">
                Address: Sandton, South Africa
              </p>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-sm text-muted-foreground">
                Related policies:
              </p>
              <a 
                href="/privacy" 
                className="inline-flex items-center text-primary hover:underline text-sm"
              >
                View Privacy Policy →
              </a>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default Terms;
