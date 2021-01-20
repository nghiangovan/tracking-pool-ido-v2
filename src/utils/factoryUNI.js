import UniswapV2Factory from 'contracts/UniswapV2Factory.json';
import { provider, address_app } from 'utils/provider';
import { ethers } from 'ethers';

export const factoryUNI = new ethers.Contract(
  address_app[process.env.REACT_APP_CHAIN_ID].factoryAddress,
  UniswapV2Factory,
  provider
);
