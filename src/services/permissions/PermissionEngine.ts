import { logger } from '@/utils/logger';
import { UserContext, PermissionRule, PermissionCache } from '@/types/permissions';

type EntityContext = { teamId?: string; assigneeId?: string; [key: string]: unknown };

export class PermissionEngine {
  private rules: Map<string, PermissionRule<EntityContext>[]> = new Map();
  private cache: PermissionCache = {};
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeRules();
  }

  private initializeRules() {
    // Organization-level rules
    this.addRule('organization.manage', {
      name: 'org-admin-manage',
      check: (context) => ['owner', 'admin'].includes(context.userRole),
      priority: 100
    });

    this.addRule('organization.invite', {
      name: 'org-admin-invite',
      check: (context) => ['owner', 'admin'].includes(context.userRole),
      priority: 100
    });

    // Equipment rules
    this.addRule('equipment.view', {
      name: 'equipment-view-members',
      check: (context) => ['owner', 'admin', 'member'].includes(context.userRole),
      priority: 50
    });

    this.addRule('equipment.view', {
      name: 'equipment-view-team',
      check: (context, entityContext) => {
        if (!entityContext?.teamId) return false;
        return context.teamMemberships.some(tm => tm.teamId === entityContext.teamId);
      },
      priority: 60
    });

    this.addRule('equipment.edit', {
      name: 'equipment-edit-admin',
      check: (context) => ['owner', 'admin'].includes(context.userRole),
      priority: 100
    });

    this.addRule('equipment.edit', {
      name: 'equipment-edit-team-manager',
      check: (context, entityContext) => {
        if (!entityContext?.teamId) return false;
        return context.teamMemberships.some(tm => 
          tm.teamId === entityContext.teamId && tm.role === 'manager'
        );
      },
      priority: 90
    });

    // Work order rules
    this.addRule('workorder.view', {
      name: 'workorder-view-members',
      check: (context) => ['owner', 'admin', 'member'].includes(context.userRole),
      priority: 50
    });

    this.addRule('workorder.view', {
      name: 'workorder-view-team',
      check: (context, entityContext) => {
        if (!entityContext?.teamId) return false;
        return context.teamMemberships.some(tm => tm.teamId === entityContext.teamId);
      },
      priority: 60
    });

    this.addRule('workorder.edit', {
      name: 'workorder-edit-admin',
      check: (context) => ['owner', 'admin'].includes(context.userRole),
      priority: 100
    });

    this.addRule('workorder.edit', {
      name: 'workorder-edit-team-manager',
      check: (context, entityContext) => {
        if (!entityContext?.teamId) return false;
        return context.teamMemberships.some(tm => 
          tm.teamId === entityContext.teamId && tm.role === 'manager'
        );
      },
      priority: 90
    });

    this.addRule('workorder.assign', {
      name: 'workorder-assign-admin',
      check: (context) => ['owner', 'admin'].includes(context.userRole),
      priority: 100
    });

    this.addRule('workorder.assign', {
      name: 'workorder-assign-team-manager',
      check: (context, entityContext) => {
        if (!entityContext?.teamId) return false;
        return context.teamMemberships.some(tm => 
          tm.teamId === entityContext.teamId && tm.role === 'manager'
        );
      },
      priority: 90
    });

    this.addRule('workorder.changestatus', {
      name: 'workorder-status-admin',
      check: (context) => ['owner', 'admin'].includes(context.userRole),
      priority: 100
    });

    this.addRule('workorder.changestatus', {
      name: 'workorder-status-team-member',
      check: (context, entityContext) => {
        if (!entityContext?.teamId) return false;
        return context.teamMemberships.some(tm => tm.teamId === entityContext.teamId);
      },
      priority: 70
    });

    this.addRule('workorder.changestatus', {
      name: 'workorder-status-assignee',
      check: (context, entityContext) => {
        return entityContext?.assigneeId === context.userId;
      },
      priority: 80
    });

    // Team rules
    this.addRule('team.view', {
      name: 'team-view-admin',
      check: (context) => ['owner', 'admin'].includes(context.userRole),
      priority: 100
    });

    this.addRule('team.view', {
      name: 'team-view-member',
      check: (context, entityContext) => {
        if (!entityContext?.teamId) return false;
        return context.teamMemberships.some(tm => tm.teamId === entityContext.teamId);
      },
      priority: 50
    });

    this.addRule('team.manage', {
      name: 'team-manage-admin',
      check: (context) => ['owner', 'admin'].includes(context.userRole),
      priority: 100
    });

    this.addRule('team.manage', {
      name: 'team-manage-manager',
      check: (context, entityContext) => {
        if (!entityContext?.teamId) return false;
        return context.teamMemberships.some(tm => 
          tm.teamId === entityContext.teamId && tm.role === 'manager'
        );
      },
      priority: 90
    });
  }

  private addRule(permission: string, rule: PermissionRule<EntityContext>) {
    if (!this.rules.has(permission)) {
      this.rules.set(permission, []);
    }
    this.rules.get(permission)!.push(rule);
    // Sort by priority (higher priority first)
    this.rules.get(permission)!.sort((a, b) => b.priority - a.priority);
  }

  private getCacheKey(permission: string, context: UserContext, entityContext?: EntityContext): string {
    const entityKey = entityContext ? JSON.stringify(entityContext) : 'null';
    return `${permission}:${context.userId}:${context.organizationId}:${entityKey}`;
  }

  private getFromCache(key: string): boolean | null {
    const cached = this.cache[key];
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      delete this.cache[key];
      return null;
    }
    
    return cached.result;
  }

  private setCache(key: string, result: boolean, ttl: number = this.CACHE_TTL) {
    this.cache[key] = {
      result,
      timestamp: Date.now(),
      ttl
    };
  }

  public clearCache() {
    this.cache = {};
  }

  public hasPermission(
    permission: string,
    context: UserContext,
    entityContext?: EntityContext
  ): boolean {
    const cacheKey = this.getCacheKey(permission, context, entityContext);
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const rules = this.rules.get(permission) || [];
    
    // Check rules in priority order - first match wins
    for (const rule of rules) {
      try {
        if (rule.check(context, entityContext)) {
          this.setCache(cacheKey, true);
          return true;
        }
      } catch (error) {
        logger.warn(`Permission rule ${rule.name} failed:`, error);
      }
    }

    this.setCache(cacheKey, false);
    return false;
  }

  public batchCheck(
    permissions: string[],
    context: UserContext,
    entityContext?: EntityContext
  ): Record<string, boolean> {
    const results: Record<string, boolean> = {};
    
    for (const permission of permissions) {
      results[permission] = this.hasPermission(permission, context, entityContext);
    }
    
    return results;
  }
}

// Singleton instance
export const permissionEngine = new PermissionEngine();