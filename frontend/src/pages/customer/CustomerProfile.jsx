import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { useUpdateProfile } from '../../hooks/useCustomer';
import { Card } from '../../components/ui/DataDisplay';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Spinner } from '../../components/ui/Feedback';

export default function CustomerProfile() {
  const { user, token, logout } = useAuth(); // We might need a reload function from context in the future
  const updateProfile = useUpdateProfile();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      await updateProfile.mutateAsync(formData);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    }
  };

  if (!user) {
    return <Spinner />;
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>Profile Settings</h1>
        <p className="ui-card-description">Manage your personal information and contact details.</p>
      </div>

      <Card elevated>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          
          <Input 
            label="Full Name" 
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
          
          <Input 
            label="Phone Number" 
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            type="tel"
          />

          <Input 
            label="Email Address" 
            value={user.email}
            disabled
            hint="Email cannot be changed."
          />
          
          <Input 
            label="Username" 
            value={user.username}
            disabled
            hint="Username cannot be changed."
          />

          <Input 
            label="Account Role" 
            value={user.role}
            disabled
            hint="Determined by system administrators."
          />

          {message && (
            <div style={{ 
              padding: 'var(--space-3)', 
              borderRadius: 'var(--radius-md)', 
              backgroundColor: message.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              color: message.type === 'success' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
            <Button 
              type="submit" 
              variant="primary" 
              isLoading={updateProfile.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
      
      <div style={{ marginTop: 'var(--space-8)' }}>
         <Card>
           <h3 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>Session</h3>
           <p className="ui-card-description" style={{ marginBottom: 'var(--space-4)' }}>Log out from this device.</p>
           <Button variant="outline" onClick={logout} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
             Sign Out
           </Button>
         </Card>
      </div>
    </div>
  );
}
