
import React from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/contexts/useSettings';
import { timezoneOptions } from '@/types/settings';

const PersonalizationSettings = () => {
  const { settings, updateSetting } = useSettings();
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personalization</CardTitle>
        <CardDescription>
          Customize your EquipQR™ experience with your preferred language, theme, and regional settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={theme}
              onValueChange={setTheme}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={settings.timezone}
              onValueChange={(value: string) => updateSetting('timezone', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFormat">Date Format</Label>
            <Select
              value={settings.dateFormat}
              onValueChange={(value: 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd' | 'MMM dd, yyyy') => 
                updateSetting('dateFormat', value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select date format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/dd/yyyy">01/15/2024</SelectItem>
                <SelectItem value="dd/MM/yyyy">15/01/2024</SelectItem>
                <SelectItem value="yyyy-MM-dd">2024-01-15</SelectItem>
                <SelectItem value="MMM dd, yyyy">Jan 15, 2024</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalizationSettings;
