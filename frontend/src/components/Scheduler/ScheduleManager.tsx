import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Play,
  Pause,
  RefreshCw,
  Info,
  AlertCircle,
  Check,
  Loader2,
  ChevronDown,
  Globe
} from 'lucide-react';
import api from '../../services/api';

/**
 * ScheduleManager Component
 *
 * Manages automated workflow execution schedules
 *
 * Features:
 * - Cron expression builder/editor
 * - Visual cron picker
 * - Timezone selector
 * - Enable/disable toggle
 * - Next run time display
 * - Execution history
 * - Schedule validation
 *
 * @component
 * @example
 * <ScheduleManager
 *   workflowId="workflow-id"
 *   onScheduleUpdate={(schedule) => console.log(schedule)}
 * />
 */

interface Schedule {
  enabled: boolean;
  cron: string;
  timezone: string;
  lastRun?: string;
  nextRun?: string;
}

interface ScheduleManagerProps {
  workflowId: string;
  onScheduleUpdate?: (schedule: Schedule) => void;
}

const CRON_PRESETS = [
  { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every 30 minutes', value: '*/30 * * * *', description: 'Runs every 30 minutes' },
  { label: 'Every hour', value: '0 * * * *', description: 'Runs at minute 0 of every hour' },
  { label: 'Every 2 hours', value: '0 */2 * * *', description: 'Runs at minute 0 of every 2nd hour' },
  { label: 'Every 6 hours', value: '0 */6 * * *', description: 'Runs at midnight, 6am, 12pm, 6pm' },
  { label: 'Daily at midnight', value: '0 0 * * *', description: 'Runs once per day at 00:00' },
  { label: 'Daily at 9am', value: '0 9 * * *', description: 'Runs once per day at 09:00' },
  { label: 'Weekly (Monday)', value: '0 0 * * 1', description: 'Runs every Monday at midnight' },
  { label: 'Monthly (1st)', value: '0 0 1 * *', description: 'Runs on the 1st of every month at midnight' },
  { label: 'Custom', value: 'custom', description: 'Define your own cron expression' }
];

const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'EST/EDT (New York)' },
  { value: 'America/Chicago', label: 'CST/CDT (Chicago)' },
  { value: 'America/Denver', label: 'MST/MDT (Denver)' },
  { value: 'America/Los_Angeles', label: 'PST/PDT (Los Angeles)' },
  { value: 'Europe/London', label: 'GMT/BST (London)' },
  { value: 'Europe/Paris', label: 'CET/CEST (Paris)' },
  { value: 'Europe/Berlin', label: 'CET/CEST (Berlin)' },
  { value: 'Asia/Tokyo', label: 'JST (Tokyo)' },
  { value: 'Asia/Shanghai', label: 'CST (Shanghai)' },
  { value: 'Asia/Kolkata', label: 'IST (India)' },
  { value: 'Australia/Sydney', label: 'AEDT/AEST (Sydney)' }
];

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  workflowId,
  onScheduleUpdate
}) => {
  const [schedule, setSchedule] = useState<Schedule>({
    enabled: false,
    cron: '0 0 * * *',
    timezone: 'UTC'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Cron builder state
  const [selectedPreset, setSelectedPreset] = useState('0 0 * * *');
  const [customCron, setCustomCron] = useState('');
  const [cronError, setCronError] = useState<string | null>(null);

  // UI state
  const [showPresets, setShowPresets] = useState(false);
  const [showTimezones, setShowTimezones] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, [workflowId]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/workflows/${workflowId}`);
      const workflow = response.data;

      if (workflow.schedule) {
        setSchedule(workflow.schedule);
        setSelectedPreset(workflow.schedule.cron);
        if (!CRON_PRESETS.find(p => p.value === workflow.schedule.cron)) {
          setSelectedPreset('custom');
          setCustomCron(workflow.schedule.cron);
        }
      }
    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      setError(err.response?.data?.error || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const validateCron = (cronExpression: string): boolean => {
    // Basic cron validation (5 fields: minute hour day month weekday)
    const parts = cronExpression.trim().split(/\s+/);

    if (parts.length !== 5) {
      setCronError('Cron expression must have exactly 5 fields (minute hour day month weekday)');
      return false;
    }

    // Validate each field
    const patterns = [
      /^(\*|([0-9]|[1-5][0-9])(\/[0-9]+)?(-([0-9]|[1-5][0-9]))?(,([0-9]|[1-5][0-9]))*)$/, // minute (0-59)
      /^(\*|([0-9]|1[0-9]|2[0-3])(\/[0-9]+)?(-([0-9]|1[0-9]|2[0-3]))?(,([0-9]|1[0-9]|2[0-3]))*)$/, // hour (0-23)
      /^(\*|([1-9]|[12][0-9]|3[01])(\/[0-9]+)?(-([1-9]|[12][0-9]|3[01]))?(,([1-9]|[12][0-9]|3[01]))*)$/, // day (1-31)
      /^(\*|([1-9]|1[0-2])(\/[0-9]+)?(-([1-9]|1[0-2]))?(,([1-9]|1[0-2]))*)$/, // month (1-12)
      /^(\*|[0-6](\/[0-9]+)?(-[0-6])?(,[0-6])*)$/ // weekday (0-6)
    ];

    for (let i = 0; i < parts.length; i++) {
      if (!patterns[i].test(parts[i])) {
        setCronError(`Invalid value in field ${i + 1}: ${parts[i]}`);
        return false;
      }
    }

    setCronError(null);
    return true;
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    setShowPresets(false);

    if (preset === 'custom') {
      setCustomCron(schedule.cron);
    } else {
      setSchedule(prev => ({ ...prev, cron: preset }));
      setCronError(null);
    }
  };

  const handleCustomCronChange = (value: string) => {
    setCustomCron(value);
    if (value.trim()) {
      const isValid = validateCron(value.trim());
      if (isValid) {
        setSchedule(prev => ({ ...prev, cron: value.trim() }));
      }
    }
  };

  const handleToggleSchedule = async () => {
    const newEnabled = !schedule.enabled;

    try {
      setSaving(true);
      setError(null);

      await api.put(`/workflows/${workflowId}`, {
        schedule: {
          ...schedule,
          enabled: newEnabled
        }
      });

      setSchedule(prev => ({ ...prev, enabled: newEnabled }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      onScheduleUpdate?.({ ...schedule, enabled: newEnabled });
    } catch (err: any) {
      console.error('Error toggling schedule:', err);
      setError(err.response?.data?.error || 'Failed to update schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    const cronToValidate = selectedPreset === 'custom' ? customCron : schedule.cron;

    if (!validateCron(cronToValidate)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updatedSchedule = {
        ...schedule,
        cron: cronToValidate
      };

      await api.put(`/workflows/${workflowId}`, {
        schedule: updatedSchedule
      });

      setSchedule(updatedSchedule);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      onScheduleUpdate?.(updatedSchedule);
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      setError(err.response?.data?.error || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getPresetLabel = () => {
    if (selectedPreset === 'custom') return 'Custom Expression';
    const preset = CRON_PRESETS.find(p => p.value === selectedPreset);
    return preset?.label || 'Select schedule';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading schedule...</span>
      </div>
    );
  }

  return (
    <div className="schedule-manager">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-gray-700" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Workflow Schedule</h2>
            <p className="text-sm text-gray-600">Automate workflow execution with cron schedules</p>
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <button
          onClick={handleToggleSchedule}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            schedule.enabled
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {schedule.enabled ? (
            <>
              <Play className="w-4 h-4" />
              Enabled
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" />
              Disabled
            </>
          )}
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700">
            <Check className="w-5 h-5" />
            <span className="font-medium">Schedule updated successfully!</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Schedule Configuration</h3>

        {/* Cron Expression Preset Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Schedule Frequency
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 transition-colors"
            >
              <span className="text-gray-900">{getPresetLabel()}</span>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
            </button>

            {showPresets && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {CRON_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetChange(preset.value)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium text-gray-900">{preset.label}</div>
                    <div className="text-sm text-gray-600 mt-0.5">{preset.description}</div>
                    {preset.value !== 'custom' && (
                      <div className="text-xs font-mono text-gray-500 mt-1 bg-gray-100 inline-block px-2 py-1 rounded">
                        {preset.value}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Custom Cron Input */}
        {selectedPreset === 'custom' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Cron Expression
            </label>
            <input
              type="text"
              value={customCron}
              onChange={(e) => handleCustomCronChange(e.target.value)}
              placeholder="*/5 * * * *"
              className={`w-full px-4 py-2 border rounded-lg font-mono focus:outline-none focus:ring-2 ${
                cronError
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {cronError && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {cronError}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Format: minute hour day month weekday (e.g., "*/5 * * * *" for every 5 minutes)
            </p>
          </div>
        )}

        {/* Timezone Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Globe className="w-4 h-4 inline mr-1" />
            Timezone
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTimezones(!showTimezones)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 transition-colors"
            >
              <span className="text-gray-900">
                {COMMON_TIMEZONES.find(tz => tz.value === schedule.timezone)?.label || schedule.timezone}
              </span>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showTimezones ? 'rotate-180' : ''}`} />
            </button>

            {showTimezones && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {COMMON_TIMEZONES.map((tz) => (
                  <button
                    key={tz.value}
                    onClick={() => {
                      setSchedule(prev => ({ ...prev, timezone: tz.value }));
                      setShowTimezones(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
                      schedule.timezone === tz.value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                    }`}
                  >
                    {tz.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveSchedule}
          disabled={saving || !!cronError}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Schedule
            </>
          )}
        </button>
      </div>

      {/* Schedule Status */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5" />
          Schedule Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Status */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <div className={`text-lg font-semibold ${schedule.enabled ? 'text-green-600' : 'text-gray-500'}`}>
              {schedule.enabled ? 'Active' : 'Inactive'}
            </div>
          </div>

          {/* Current Cron */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Cron Expression</div>
            <div className="text-lg font-mono font-semibold text-gray-900">{schedule.cron}</div>
          </div>

          {/* Last Run */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Last Run
            </div>
            <div className="text-sm font-medium text-gray-900">
              {formatDateTime(schedule.lastRun)}
            </div>
          </div>

          {/* Next Run */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
              <RefreshCw className="w-4 h-4" />
              Next Run
            </div>
            <div className="text-sm font-medium text-blue-600">
              {schedule.enabled ? formatDateTime(schedule.nextRun) : 'Disabled'}
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-2">About Cron Schedules</p>
            <p className="mb-2">
              Cron expressions define when your workflow should run automatically. They consist of 5 fields:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><span className="font-mono">minute</span> (0-59)</li>
              <li><span className="font-mono">hour</span> (0-23)</li>
              <li><span className="font-mono">day of month</span> (1-31)</li>
              <li><span className="font-mono">month</span> (1-12)</li>
              <li><span className="font-mono">day of week</span> (0-6, Sunday=0)</li>
            </ul>
            <p className="mt-2 text-xs">
              Use <span className="font-mono bg-blue-100 px-1">*</span> for "any value",
              <span className="font-mono bg-blue-100 px-1 ml-1">*/n</span> for "every n units", and
              <span className="font-mono bg-blue-100 px-1 ml-1">-</span> for ranges.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleManager;
