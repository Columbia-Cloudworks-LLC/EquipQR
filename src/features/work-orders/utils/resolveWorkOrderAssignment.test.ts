import { describe, expect, it } from 'vitest';
import { resolveWorkOrderAssignment } from './resolveWorkOrderAssignment';

describe('resolveWorkOrderAssignment', () => {
  it('returns Unassigned when no id is present', () => {
    expect(resolveWorkOrderAssignment({})).toEqual({ id: null, name: 'Unassigned', avatarUrl: null });
    expect(resolveWorkOrderAssignment({ assignee_id: null })).toEqual({ id: null, name: 'Unassigned', avatarUrl: null });
    expect(resolveWorkOrderAssignment({ assigneeId: undefined })).toEqual({ id: null, name: 'Unassigned', avatarUrl: null });
  });

  it('uses assignee_id or assigneeId', () => {
    expect(resolveWorkOrderAssignment({ assignee_id: '123' }).id).toBe('123');
    expect(resolveWorkOrderAssignment({ assigneeId: '456' }).id).toBe('456');
    // assignee_id takes precedence
    expect(resolveWorkOrderAssignment({ assignee_id: '123', assigneeId: '456' }).id).toBe('123');
  });

  it('pulls name and avatar from assignee', () => {
    const result = resolveWorkOrderAssignment({
      assignee_id: '123',
      assignee: { id: '123', name: 'John Doe', avatar_url: 'avatar.png' }
    });
    expect(result).toEqual({ id: '123', name: 'John Doe', avatarUrl: 'avatar.png' });
  });

  it('pulls name and avatar from assignedTo', () => {
    const result = resolveWorkOrderAssignment({
      assigneeId: '123',
      assignedTo: { id: '123', name: 'Jane Doe', avatarUrl: 'avatar2.png' }
    });
    expect(result).toEqual({ id: '123', name: 'Jane Doe', avatarUrl: 'avatar2.png' });
  });

  it('falls back to assigneeName', () => {
    const result = resolveWorkOrderAssignment({
      assigneeId: '123',
      assigneeName: 'Jack Smith'
    });
    expect(result).toEqual({ id: '123', name: 'Jack Smith', avatarUrl: null });
  });

  it('defaults to Assigned user if no name is available', () => {
    const result = resolveWorkOrderAssignment({
      assigneeId: '123'
    });
    expect(result).toEqual({ id: '123', name: 'Assigned user', avatarUrl: null });
  });
});
