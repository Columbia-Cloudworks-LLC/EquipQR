import { describe, expect, it } from 'vitest';
import {
  areRecordsOnAccessibleTeam,
  isOrgAdminRole,
  isRecordOnAccessibleTeam,
  resolveTeamReadScope,
  teamAccessQueryScope,
} from './teamAccessScope';

describe('isRecordOnAccessibleTeam', () => {
  it('allows org admins to see any team including unassigned', () => {
    expect(isRecordOnAccessibleTeam(true, [], 'team-b')).toBe(true);
    expect(isRecordOnAccessibleTeam(true, ['team-a'], null)).toBe(true);
  });

  it('scopes non-admins to teams they belong to', () => {
    expect(isRecordOnAccessibleTeam(false, ['team-a'], 'team-a')).toBe(true);
    expect(isRecordOnAccessibleTeam(false, ['team-a'], 'team-b')).toBe(false);
  });

  it('hides unassigned records from non-admins', () => {
    expect(isRecordOnAccessibleTeam(false, ['team-a'], null)).toBe(false);
    expect(isRecordOnAccessibleTeam(false, ['team-a'], undefined)).toBe(false);
  });
});

describe('areRecordsOnAccessibleTeam', () => {
  it('rejects a work order whose equipment team is outside membership', () => {
    expect(areRecordsOnAccessibleTeam(false, ['team-cs'], 'team-cs', 'team-fleet')).toBe(false);
    expect(areRecordsOnAccessibleTeam(false, ['team-cs'], 'team-cs', 'team-cs')).toBe(true);
  });

  it('rejects when every team id is missing', () => {
    expect(areRecordsOnAccessibleTeam(false, ['team-cs'], null, undefined)).toBe(false);
  });
});

describe('isOrgAdminRole', () => {
  it('treats owner and admin as org admins', () => {
    expect(isOrgAdminRole('owner')).toBe(true);
    expect(isOrgAdminRole('admin')).toBe(true);
    expect(isOrgAdminRole('member')).toBe(false);
    expect(isOrgAdminRole(undefined)).toBe(false);
  });
});

describe('teamAccessQueryScope', () => {
  it('separates admin, empty, and sorted membership keys', () => {
    expect(teamAccessQueryScope(true, ['team-b'])).toBe('admin');
    expect(teamAccessQueryScope(false, undefined)).toBe('none');
    expect(teamAccessQueryScope(false, [])).toBe('none');
    expect(teamAccessQueryScope(false, ['team-b', 'team-a'])).toBe('team-a,team-b');
  });
});

describe('resolveTeamReadScope', () => {
  it('fails closed when non-admin team ids are omitted', () => {
    expect(resolveTeamReadScope()).toEqual({ isOrgAdmin: false, userTeamIds: [] });
    expect(resolveTeamReadScope({ isOrgAdmin: false })).toEqual({
      isOrgAdmin: false,
      userTeamIds: [],
    });
    expect(resolveTeamReadScope({ isOrgAdmin: true })).toEqual({ isOrgAdmin: true });
    expect(resolveTeamReadScope({ isOrgAdmin: false, userTeamIds: ['team-cs'] })).toEqual({
      isOrgAdmin: false,
      userTeamIds: ['team-cs'],
    });
  });
});
