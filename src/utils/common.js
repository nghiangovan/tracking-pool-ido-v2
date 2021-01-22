import { ethers } from 'ethers';

export function formatNumber(value) {
  value += '';
  const list = value.split('.');
  const prefix = list[0].charAt(0) === '-' ? '-' : '';
  let num = prefix ? list[0].slice(1) : list[0];
  let result = '';
  while (num.length > 3) {
    result = `,${num.slice(-3)}${result}`;
    num = num.slice(0, num.length - 3);
  }
  if (num) {
    result = num + result;
  }
  return `${prefix}${result}${list[1] ? `.${list[1]}` : ''}`;
}

export function formartWeiToGwei(amount) {
  return parseFloat(ethers.utils.formatUnits(amount, 'gwei')).toFixed(3);
}

export function formartWeiToEth(amount) {
  return parseFloat(ethers.utils.formatEther(amount.toString()));
}
export function calcFee(gasLimit, gasPrice) {
  return parseFloat(gasLimit) > 0 && parseFloat(gasPrice)
    ? formartWeiToEth(gasLimit) * formartWeiToEth(gasPrice) * 1e18
    : 0;
}

export function calcAmountOut(liquidity1, liquidity2, amountIn) {
  return (
    (liquidity2 * amountIn * 997) / (parseFloat(liquidity1) * 1000 + parseFloat(amountIn) * 997)
  );
}
