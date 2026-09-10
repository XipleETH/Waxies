import type { RpcRequest } from './ronin';
/**
 * Ronin Waypoint = "Sky Mavis account" login (email / social, no browser
 * extension). It returns an EIP-1193 provider, so we adapt it to the exact
 * shape the Ronin Wallet flow ([ronin-axies]) already consumes.
 *
 * Only active when a client ID is configured. Set it in the environment:
 *   NEXT_PUBLIC_WAYPOINT_CLIENT_ID=<client id from the Ronin Developer Console>
 * and register your app's redirect URI (its origin) there. Until then the
 * "Iniciar con Sky Mavis" button stays hidden and nothing here loads the SDK.
 */
export interface WalletProvider {
  request: RpcRequest;
  on?: (event: string, listener: (value: unknown) => void) => void;
  removeListener?: (event: string, listener: (value: unknown) => void) => void;
  disconnect?: () => void;
}
export const WAYPOINT_CLIENT_ID =
  process.env.NEXT_PUBLIC_WAYPOINT_CLIENT_ID ?? '';
export const WAYPOINT_ENABLED = WAYPOINT_CLIENT_ID.length > 0;
const RONIN_MAINNET_CHAIN_ID = 2020;
export async function createWaypointProvider(): Promise<WalletProvider> {
  if (!WAYPOINT_CLIENT_ID)
    throw new Error('Falta configurar la cuenta Sky Mavis (client ID).');
  const { WaypointProvider } = await import('@sky-mavis/waypoint');
  const wp = WaypointProvider.create({
    clientId: WAYPOINT_CLIENT_ID,
    chainId: RONIN_MAINNET_CHAIN_ID,
  });
  return {
    request: wp.request as unknown as RpcRequest,
    on: (event, listener) => {
      wp.on(event, listener);
    },
    removeListener: (event, listener) => {
      wp.removeListener(event, listener);
    },
    disconnect: () => {
      wp.disconnect();
    },
  };
}
