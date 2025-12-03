import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { Mail, User, Calendar, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AccountInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountInfoModal: React.FC<AccountInfoModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, authUser } = useUser();
  const { toast } = useToast();

  const handleDeleteAccount = () => {
    toast({
      title: "Delete Account",
      description: "To delete your account, please contact support@se-mogroup.com",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border rounded-3xl">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground">Account Information</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3 bg-secondary/30 rounded-2xl p-4">
            <div className="flex items-center gap-3 py-2">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="font-medium text-foreground">@{currentUser?.username || 'Not set'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 py-2 border-t border-border/50">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{authUser?.email || 'Not set'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 py-2 border-t border-border/50">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="font-medium text-foreground">
                  {authUser?.created_at 
                    ? new Date(authUser.created_at).toLocaleDateString() 
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleDeleteAccount}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountInfoModal;