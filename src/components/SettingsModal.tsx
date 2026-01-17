import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  User, 
  Lock, 
  Bell, 
  HelpCircle, 
  Info,
  Moon,
  Globe,
  LogOut,
  ChevronRight,
  DollarSign
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import AccountInfoModal from './settings/AccountInfoModal';
import PrivacySecurityModal from './settings/PrivacySecurityModal';
import NotificationsModal from './settings/NotificationsModal';
import LanguageModal from './settings/LanguageModal';
import HelpCenterModal from './settings/HelpCenterModal';
import CreatorDashboardModal from './CreatorDashboardModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { signOut } = useUser();
  const [darkMode, setDarkMode] = useState(false);
  const [openModal, setOpenModal] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut();
    onClose();
    navigate('/auth');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Account Information', action: () => setOpenModal('account') },
        { icon: Lock, label: 'Privacy & Security', action: () => setOpenModal('privacy') },
        { icon: Bell, label: 'Notifications', action: () => setOpenModal('notifications') },
      ],
    },
    {
      title: 'Creator',
      items: [
        { icon: DollarSign, label: 'Creator Dashboard & Earnings', action: () => setOpenModal('creator') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: Moon, label: 'Dark Mode', toggle: true, value: darkMode, onChange: toggleDarkMode },
        { icon: Globe, label: 'Language', action: () => setOpenModal('language') },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', action: () => setOpenModal('help') },
        { icon: Info, label: 'About', action: () => { onClose(); navigate('/about'); } },
        { icon: Lock, label: 'Terms & Policies', action: () => { onClose(); navigate('/terms'); } },
      ],
    },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto bg-card border-border rounded-3xl shadow-2xl">
          <DialogHeader className="pb-4 border-b border-border">
            <DialogTitle className="text-xl font-semibold text-foreground">Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {settingsSections.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  {section.title}
                </h3>
                <div className="space-y-1 bg-secondary/30 rounded-2xl overflow-hidden">
                  {section.items.map((item, itemIdx) => (
                    <Button
                      key={itemIdx}
                      variant="ghost"
                      className="w-full justify-between h-auto py-4 px-4 rounded-none hover:bg-secondary/50 text-foreground"
                      onClick={item.action}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {item.toggle ? (
                        <Switch checked={item.value} onCheckedChange={item.onChange} />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            ))}

            {/* Logout Button */}
            <Button
              variant="destructive"
              className="w-full rounded-2xl h-12"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-modals */}
      <AccountInfoModal isOpen={openModal === 'account'} onClose={() => setOpenModal(null)} />
      <PrivacySecurityModal isOpen={openModal === 'privacy'} onClose={() => setOpenModal(null)} />
      <NotificationsModal isOpen={openModal === 'notifications'} onClose={() => setOpenModal(null)} />
      <LanguageModal isOpen={openModal === 'language'} onClose={() => setOpenModal(null)} />
      <HelpCenterModal isOpen={openModal === 'help'} onClose={() => setOpenModal(null)} />
      <CreatorDashboardModal isOpen={openModal === 'creator'} onClose={() => setOpenModal(null)} />
    </>
  );
};

export default SettingsModal;