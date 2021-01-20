import { ethers } from 'ethers';

export const chain = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'rinkeby'
};

export const provider = new ethers.providers.InfuraProvider(
  chain[process.env.REACT_APP_CHAIN_ID],
  process.env.REACT_APP_INFURA_ID
);
// let provider = new ethers.providers.JsonRpcProvider(
//   `https://${chain[process.env.REACT_APP_CHAIN_ID]}.infura.io/v3/62349edb370e4523b328b8823d211551`,
//   chain[process.env.REACT_APP_CHAIN_ID]
// );

export const address_app = {
  1: {
    routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f'
  },
  4: {
    routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    WETH: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
    DAI: '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735'
  }
};
