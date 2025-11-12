import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  X, 
  User, 
  Lock, 
  Bell, 
  Shield, 
  HelpCircle, 
  Info,
  Moon,
  Globe,
  LogOut
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const settingsSections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Account Information', action: () => console.log('Account info') },
        { icon: Lock, label: 'Privacy & Security', action: () => console.log('Privacy') },
        { icon: Bell, label: 'Notifications', action: () => console.log('Notifications') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: Moon, label: 'Dark Mode', toggle: true },
        { icon: Globe, label: 'Language', action: () => console.log('Language') },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', action: () => console.log('Help') },
        { icon: Info, label: 'About', action: () => console.log('About') },
        { icon: Shield, label: 'Terms & Policies', action: () => console.log('Terms') },
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-border rounded-3xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {settingsSections.map((section, idx) => (
            <div key={idx}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item, itemIdx) => (
                  <Button
                    key={itemIdx}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 px-3"
                    onClick={item.action}
                  >
                    <item.icon className="w-5 h-5 mr-3 text-muted-foreground" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.toggle && <Switch />}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          {/* Logout Button */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              // Clear user session and redirect to auth
              window.location.href = '/auth';
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
