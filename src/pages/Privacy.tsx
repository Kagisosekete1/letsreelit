import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[600px] max-h-[90vh] bg-card border-border rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">Privacy Policy</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-80px)]">
          <div className="px-6 py-6 space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Muv'it – Privacy Policy</h2>
              <p className="text-muted-foreground text-sm">Effective Date: January 2025</p>
              <p className="leading-relaxed text-sm">
                Your privacy is important to us. This Privacy Policy explains how Muv'it ("we," "our," or "us") collects, uses, discloses, and protects your information when you use our mobile application and services.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">1. Information We Collect</h3>
              
              <div className="space-y-3">
                <h4 className="font-medium text-foreground/90">1.1 Information You Provide</h4>
                <ul className="list-disc list-inside space-y-2 text-foreground/90 text-sm">
                  <li><strong>Account Information:</strong> When you create an account, we collect your username, email address, password, and profile information (display name, bio, profile picture).</li>
                  <li><strong>User Content:</strong> Videos, comments, messages, and other content you create or share through the app.</li>
                  <li><strong>Communications:</strong> Information you provide when you contact us for support or feedback.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-foreground/90">1.2 Information Collected Automatically</h4>
                <ul className="list-disc list-inside space-y-2 text-foreground/90 text-sm">
                  <li><strong>Device Information:</strong> Device type, operating system, unique device identifiers, and mobile network information.</li>
                  <li><strong>Usage Data:</strong> How you interact with the app, including videos watched, engagement patterns, and feature usage.</li>
                  <li><strong>Log Data:</strong> IP address, browser type, access times, and pages viewed.</li>
                  <li><strong>Location:</strong> General location data based on IP address (we do not collect precise GPS location).</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">2. How We Use Your Information</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 text-sm">
                <li>Provide, maintain, and improve our services</li>
                <li>Personalize your experience and show relevant content</li>
                <li>Process transactions and send related information</li>
                <li>Send notifications about likes, comments, follows, and other activity</li>
                <li>Respond to your comments, questions, and support requests</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, investigate, and prevent fraudulent or illegal activities</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">3. Sharing of Information</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">We may share your information in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 text-sm">
                <li><strong>Public Content:</strong> Your profile and public videos are visible to other users.</li>
                <li><strong>Service Providers:</strong> Third parties who perform services on our behalf (hosting, analytics, customer support).</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety.</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">4. Data Security</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">5. Data Retention</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">6. Your Rights</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">Depending on your location, you may have the right to:</p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 text-sm">
                <li>Access and receive a copy of your personal data</li>
                <li>Correct inaccurate personal data</li>
                <li>Request deletion of your personal data</li>
                <li>Object to or restrict processing of your data</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">7. Children's Privacy</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                Muv'it is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">8. Third-Party Services</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                Our app may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">9. International Data Transfers</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">10. Changes to This Policy</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy within the app and updating the "Effective Date."
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">11. Contact Us</h3>
              <p className="leading-relaxed text-foreground/90 text-sm">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="leading-relaxed text-foreground/90 text-sm">
                Email: <a href="mailto:Info@se-mogroup.com" className="text-primary hover:underline">Info@se-mogroup.com</a>
              </p>
              <p className="leading-relaxed text-foreground/90 text-sm">
                Address: Sandton, South Africa
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                By using Muv'it, you acknowledge that you have read and understood this Privacy Policy and agree to the collection, use, and disclosure of your information as described herein.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default Privacy;
