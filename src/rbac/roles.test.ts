import { expect, test, describe, beforeEach, failed } from 'vitest';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import { v4 as uuidv4 } from 'uuid';

pulumi.runtime.setMocks(
  {
    newResource: function (args: pulumi.runtime.MockResourceArgs): {
      id: string;
      state: any;
    } {
      return {
        id: args.inputs.name + '_id',
        state: args.inputs,
      };
    },
    call: function (args: pulumi.runtime.MockCallArgs) {
      return args.inputs;
    },
  },
  'project',
  'stack',
  false, // Sets the flag `dryRun`, which indicates if pulumi is running in preview mode.
);

describe('RBAC Roles Assignments', function () {
  let AzureRoles: typeof import('./roles');
  let NetworkCore: typeof import('../network/core-network');
  beforeEach(async function () {
    // It's important to import the program _after_ the mocks are defined.
    AzureRoles = await import('./roles');
    NetworkCore = await import('../network/core-network');
  });

  describe('RoleUUID', function () {
    test('is defined', function () {
      expect(AzureRoles.RoleUUID).toBeDefined();
    });
    test('has Private Dns Zone contributor', function () {
      expect(AzureRoles.RoleUUID.PrivateDNSZoneContributor).toBe(
        'b12aa53e-6015-4669-85d0-8515ebb3ae7f',
      );
    });
    test('has virtual network contributor', function () {
      expect(AzureRoles.RoleUUID.NetworkContributor).toBe(
        '4d97b98b-1d4f-4787-a291-c67834d212e7',
      );
    });
    test('has keyvault secrets user', function () {
      expect(AzureRoles.RoleUUID.KeyVaultSecretUser).toBe(
        '4633458b-17de-408a-b874-0445c86b69e6',
      );
    });
    test('has keyvault secrets officer', function () {
      expect(AzureRoles.RoleUUID.KeyVaultSecretOfficer).toBe(
        'b86a8fe4-44ce-4948-aee5-eccb2c155cd7',
      );
    });
    test('has keyvault crypto user', function () {
      expect(AzureRoles.RoleUUID.KeyVaultCryptoUser).toBe(
        '12338af0-0e69-4776-bea7-57ae8d297424',
      );
    });
    test('has keyvault crypto officer', function () {
      expect(AzureRoles.RoleUUID.KeyVaultCryptoOfficer).toBe(
        '14b46e9e-c2b7-41b4-b07b-48a6ebf60603',
      );
    });
    test('has keyvault certificate user', function () {
      expect(AzureRoles.RoleUUID.KeyVaultCertificateUser).toBe(
        'db79e9a7-68ee-4b58-9aeb-b90e7c24fcba',
      );
    });
    test('has keyvault certificate officer', function () {
      expect(AzureRoles.RoleUUID.KeyVaultCertificateOfficer).toBe(
        'a4417e6f-fecd-4de8-b567-7b0420556985',
      );
    });
  });

  describe('assignRole', function () {
    test('is defined', function () {
      expect(AzureRoles.assignRole).toBeDefined();
    });
    test('assigns a role', function () {
      const resourceGroup = new azure_native.resources.ResourceGroup(
        'rg-test',
        {
          resourceGroupName: 'rg-test',
        },
      );
      NetworkCore.setupNetwork(resourceGroup, 'vnet-test', '10.0.0.0/20');
      const roleAssignment = AzureRoles.assignRole({
        principal: { id: 'principal-id', type: 'principal-type' },
        rbacRole: AzureRoles.RoleUUID.PrivateDNSZoneContributor,
        scope: NetworkCore.virtualNetwork.id,
        key: 'kubernetes',
        subscriptionId: 'subscription-id',
      });
      pulumi
        .all([
          roleAssignment.principalId,
          roleAssignment.principalType,
          roleAssignment.roleDefinitionId,
          roleAssignment.scope,
          NetworkCore.virtualNetwork.id,
        ])
        .apply(
          ([
            principalId,
            principalType,
            roleDefinitionId,
            scope,
            networkId,
          ]) => {
            expect(principalId).toBe('principal-id');
            expect(principalType).toBe('principal-type');
            expect(roleDefinitionId).toBe(
              `/subscriptions/subscription-id/providers/Microsoft.Authorization/roleDefinitions/${AzureRoles.RoleUUID.PrivateDNSZoneContributor}`,
            );
            expect(scope).toBe(networkId);
          },
        );
    });
  });

  describe('assignKeyVaultOfficers', function () {
    test('is defined', function () {
      expect(AzureRoles.assignKeyVaultOfficers).toBeDefined();
    });
    test('assigns keyvault officers', async function () {
      const keyVault = new azure_native.keyvault.Vault('keyVault', {
        location: 'East US',
        resourceGroupName: 'resourceGroupName',
        properties: {
          sku: {
            family: 'A',
            name: 'standard',
          },
          tenantId: 'tenantId',
          accessPolicies: [],
        },
      });
      const subscriptionId = uuidv4();
      const roleAssignments = await AzureRoles.assignKeyVaultOfficers({
        principal: { id: 'principal-id', type: 'principal-type' },
        keyVault,
        subscriptionId,
      });
      expect(roleAssignments).toHaveLength(3);

      roleAssignments.forEach((roleAssignment) => {
        const expectedRoleDefinitionId = [
          `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${AzureRoles.RoleUUID.KeyVaultSecretOfficer}`,
          `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${AzureRoles.RoleUUID.KeyVaultCertificateOfficer}`,
          `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${AzureRoles.RoleUUID.KeyVaultCryptoOfficer}`,
        ];
        roleAssignment.roleDefinitionId.apply((roleDefinitionId) => {
          expect(expectedRoleDefinitionId).toContain(roleDefinitionId);
        });
        roleAssignment.principalId.apply((principalId) => {
          expect(principalId).toContain('principal-id');
        });
        roleAssignment.principalType.apply((principalType) => {
          expect(principalType).toContain('principal-type');
        });
        pulumi
          .all([roleAssignment.scope, keyVault.id])
          .apply(([scope, keyVaultId]) => {
            expect(scope).toBe(keyVaultId);
          });
      });
    });
  });
});
