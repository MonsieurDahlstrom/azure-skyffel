declare const _default: {
  createNetwork: (
    resourceGroup: import('@pulumi/azure-native/resources').ResourceGroup,
    name: string,
    cidr: string,
  ) => import('@pulumi/azure-native/network').VirtualNetwork;
  createSubnets: (
    snets: Map<string, import('@pulumi/azure-native/network').SubnetArgs>,
  ) => Map<string, import('@pulumi/azure-native/network').Subnet>;
  createAks: (input: {
    resourceGroup: import('@pulumi/azure-native/resources').ResourceGroup;
    vnet: import('@pulumi/azure-native/network').VirtualNetwork;
    nodes: import('@pulumi/azure-native/network').Subnet;
    pods?: import('@pulumi/azure-native/network').Subnet;
    defaultNode: {
      min: string;
      max: string;
      vmSize: string;
      zones: string[];
    };
    privateDnsZone?: import('@pulumi/azure-native/network').PrivateZone;
    commonTags?: {
      [key: string]: string;
    };
  }) => void;
};
export = _default;
//# sourceMappingURL=index.d.cts.map
