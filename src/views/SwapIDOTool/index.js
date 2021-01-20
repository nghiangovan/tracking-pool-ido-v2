import React, { useEffect, useState } from 'react';
import './style.scss';
import useInterval from 'utils/useInterval';
import { message, Input, Row, Col, Button, Spin } from 'antd';
import { ArrowDownOutlined, LoadingOutlined } from '@ant-design/icons';
import UniswapV2Pair from 'contracts/UniswapV2Pair.json';
import Erc20 from 'contracts/Erc20.json';
import UniswapV2Router02 from 'contracts/UniswapRouterV2.json';
import { ethers } from 'ethers';
import { formartWeiToEth, calcFee } from 'utils/common';
import { factoryUNI } from 'utils/factoryUNI';
import { provider, address_app } from 'utils/provider';
import LeftSwap from './LeftSwap';
import RightSwap from './RightSwap';
import {
  ChainId,
  Token,
  Fetcher,
  Trade,
  Route,
  TokenAmount,
  TradeType,
  Percent
} from '@uniswap/sdk';

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;
const address0 = '0x0000000000000000000000000000000000000000';

function SwapTool() {
  const [transactions, setTransactions] = useState([]);
  const [myTransactions, setMyTransactions] = useState([]);
  const [gas, setGas] = useState(165127);
  const [gasPrice, setGasPrice] = useState(44000000000);
  const [statusTracking, setStatusTracking] = useState(false);
  const [addressToken1, setAddressToken1] = useState(
    address_app[process.env.REACT_APP_CHAIN_ID].WETH
  );
  const [instanceToken1, setInstanceToken1] = useState(null);
  const [balanceETH, setbBlanceETH] = useState(0);
  const [addressToken2, setAddressToken2] = useState(
    address_app[process.env.REACT_APP_CHAIN_ID].DAI
  );
  const [instanceToken2, setInstanceToken2] = useState(null);
  const [pair, setPair] = useState(null);
  const [liquidity1, setLiquidity1] = useState(0);
  const [liquidity2, setLiquidity2] = useState(0);
  const [amount, setAmount] = useState(0.1);
  const [amountOut, setAmountOut] = useState(0);
  const [privateKey, setPrivateKey] = useState(process.env.REACT_APP_PRIVATE_KEY);
  const [slippage, setSlippage] = useState(0);
  const [instancePair, setInstancePair] = useState(null);
  const [amountOutMin, setAmountOutMin] = useState(0);
  const [decimals1, setDecimals1] = useState(null);
  const [decimals2, setDecimals2] = useState(null);
  const [symbol1, setSymbol1] = useState('WETH');
  const [symbol2, setSymbol2] = useState('DAI');
  const [instanceToken1SDK, setInstanceToken1SDK] = useState(null);
  const [instanceToken2SDK, setInstanceToken2SDK] = useState(null);
  const [instanceRouteSDK, setInstanceRouteSDK] = useState(null);
  const [trackPair, setTrackPair] = useState(null);
  const [trackBal, setTrackBal] = useState(null);
  const [statusAutoSwap, setStatusAutoSwap] = useState(true);
  const [loadingSlippage, setLoadingSlippage] = useState(false);
  const [currentBlock, setCurrentBlock] = useState(null);
  const [messageLoading, setMessageLoading] = useState('');
  const [loadingAutoSwap, setLoadingAutoSwap] = useState(false);

  useInterval(async () => {
    console.log('tracking balance...');
    if (instancePair && pair !== address0) {
      let reverves = await instancePair.getReserves();
      let blockNumber = await provider.getBlockNumber();
      console.log(currentBlock, blockNumber);
      if (
        statusAutoSwap &&
        parseInt(reverves[1]) > 0 &&
        currentBlock &&
        blockNumber > currentBlock
      ) {
        swapExactETHForTokens();
        setTrackBal(null);
        startTracking();
        setLoadingAutoSwap(false);
        setMessageLoading('');
      }
    } else {
      createInstancePair();
    }
  }, trackBal);

  useInterval(async () => {
    console.log('tracking pair...');
    let pair = await factoryUNI.getPair(addressToken1, addressToken2);
    setPair(pair);
    setAmountOutMin(0);
    if (pair !== address0) {
      setPair(pair);
      startTracking();
      setTrackPair(null);
      setTrackBal(1500);
      let blockNumber = await provider.getBlockNumber();
      setCurrentBlock(blockNumber);
      setMessageLoading('Automatic swaps processing...');
      setLoadingAutoSwap(true);
    }
  }, trackPair);

  function checkLiquidity() {
    if (!instanceToken1) {
      setInstanceAndDecimalToken1();
    }

    if (!instanceToken2) {
      setInstanceAndDecimalToken2();
    }

    if (!instancePair && instancePair === address0) {
      createInstancePair();
    }
  }

  async function calcTrade() {
    setLoadingSlippage(true);
    if (
      !addressToken1 ||
      !addressToken2 ||
      slippage > 50 ||
      amount <= 0 ||
      !statusTracking ||
      !instanceToken1SDK ||
      !instanceToken2SDK ||
      !instanceRouteSDK
    ) {
      setLoadingSlippage(false);
      return;
    }

    const tradeSDK = new Trade(
      instanceRouteSDK,
      new TokenAmount(instanceToken1SDK, amount * 1e18),
      TradeType.EXACT_INPUT
    );
    const slippageTolerance = new Percent(slippage, '100'); // 50 bips, or 0.50%
    const minOut = tradeSDK.minimumAmountOut(slippageTolerance).raw;
    setAmountOutMin(parseFloat(formartWeiToEth(minOut)));
    setLoadingSlippage(false);
  }

  useEffect(() => {
    calcTrade();
  }, [transactions, instancePair, instanceRouteSDK, liquidity1, liquidity2]);
  useEffect(() => {
    if (instancePair && pair !== address0) {
      updateLiquidity();
    }
  }, [transactions, instancePair, addressToken2, addressToken1]);

  async function swapExactETHForTokens() {
    let wallet = new ethers.Wallet(privateKey, provider);
    let router = new ethers.Contract(
      address_app[process.env.REACT_APP_CHAIN_ID].routerAddress,
      UniswapV2Router02,
      wallet
    );
    let deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    if (!addressToken1 || !addressToken2) {
      message.error('Please fill up token address');
      return;
    }
    var overrideOptions = {
      gasLimit: gas,
      gasPrice: gasPrice,
      value: ethers.utils.parseEther(amount.toString()).toString()
    };
    let swap = await router.swapExactETHForTokens(
      ethers.utils.parseEther(amountOut.toString()).toString(),
      [addressToken1, addressToken2],
      wallet.address,
      deadline,
      overrideOptions
    );

    message.success(swap.hash);
    var transaction = {
      gasLimit: gas,
      gasPrice: gasPrice,
      hash: swap.hash
    };

    transaction['timestamp'] = '';
    transaction['key'] = swap.hash;

    console.log(transaction);
    setMyTransactions(myTransactions => [transaction, ...myTransactions]);
  }

  async function startTracking() {
    console.log('Start Tracking');
    setStatusTracking(true);
    let pair = await factoryUNI.getPair(addressToken1, addressToken2);
    createInstancePair();
    if (pair !== address0) {
      const pairContract = new ethers.Contract(pair, UniswapV2Pair, provider);
      let reverves = await pairContract.getReserves();
      if (parseFloat(reverves[1]) === 0.0) {
        setTrackBal(1500);
        return;
      }
    } else {
      setTrackPair(1000);
      return;
    }
    setPair(pair);
    console.log('pair', pair);
    checkLiquidity();
    message.success('Start Tracking');
    let filter = {
      address: pair,
      topics: [ethers.utils.id('Swap(address,uint256,uint256,uint256,uint256,address)')]
    };
    provider.on(filter, async event => {
      await updateListTransaction(event);
    });

    // const account = pair.toLowerCase();
    // const subscription = web3.eth.subscribe('pendingTransactions', (err, res) => {
    //   if (err) console.error(err);
    // });
    // subscription.on('data', async txHash => {
    //   try {
    //     let tx = await web3.eth.getTransaction(txHash);

    //     if (tx && tx.to) {
    //       // This is the point you might be looking for to filter the address
    //       if (tx.to.toLowerCase() === account) {
    //         console.log('Transaction Hash: ', txHash);
    //         console.log('Transaction Confirmation Index: ', tx.transactionIndex); // 0 when transaction is pending
    //         console.log('Transaction Received from: ', tx.from);
    //         console.log('Transaction Amount(in Ether): ', web3.utils.fromWei(tx.value, 'ether'));
    //         console.log('Transaction Receiving Date/Time: ', new Date());
    //       }
    //     }
    //   } catch (err) {
    //     console.error(err);
    //   }
    // });
  }

  async function updateListTransaction(event) {
    let transaction = await provider.getTransaction(event.transactionHash);
    let block = await provider.getBlock(transaction.blockNumber);
    transaction['timestamp'] = block.timestamp;
    transaction['key'] = transaction.hash;
    setTransactions(transactions => [transaction, ...transactions]);
    console.log('txt', transaction);
    console.log(transactions);
  }

  const [time, setTime] = useState(0);
  useInterval(() => {
    setTime(time + 1);
  }, 1000);

  function changeGas(e) {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '') {
      setGas(value);
    }
  }
  function changeGasPrice(e) {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '') {
      setGasPrice(value);
    }
  }
  async function changeToken1(e) {
    const { value } = e.target;
    setAddressToken1(value);
    if (ethers.utils.isAddress(value)) {
      let contract = new ethers.Contract(value, Erc20, provider);
      if (contract.address !== address0) {
        let symbol = await contract.symbol();
        setSymbol1(symbol);
      }
    } else {
      setInstanceToken1(null);
    }
  }
  async function changeToken2(e) {
    const { value } = e.target;
    setAddressToken2(value);
    if (ethers.utils.isAddress(value)) {
      let contract = new ethers.Contract(value, Erc20, provider);
      if (contract.address !== address0) {
        let symbol = await contract.symbol();
        setSymbol2(symbol);
      }
    } else {
      setInstanceToken2(null);
    }
  }
  function changeAmount(e) {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '') {
      setAmount(value);
    }
  }
  function changeAmountOut(e) {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '') {
      setAmountOut(value);
    }
  }
  function changeSlippage(e) {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '') {
      setSlippage(value);
    }
  }
  function tokenSwapping() {
    let address1 = addressToken1;
    setAddressToken1(addressToken2);
    setAddressToken2(address1);
  }

  useEffect(() => {
    if (
      addressToken1 &&
      addressToken2 &&
      ethers.utils.isAddress(addressToken1) &&
      ethers.utils.isAddress(addressToken2)
    ) {
      setInstanceAndDecimalToken1();
    }
  }, [addressToken1, transactions]);
  async function setInstanceAndDecimalToken1() {
    let contractToken1 = new ethers.Contract(addressToken1, Erc20, provider);
    let addressPair = await factoryUNI.getPair(addressToken1, addressToken2);
    if (contractToken1.address !== address0 && addressPair !== address0) {
      setInstanceToken1(contractToken1);
      let decimals1 = await contractToken1.decimals();
      // const TOKEN1 = new Token(ChainId.MAINNET, addressToken1, decimals1);
      const TOKEN1 = new Token(ChainId.RINKEBY, addressToken1, decimals1);
      let pairSDK;
      let TOKEN2;
      if (!instanceToken2SDK) {
        let decimalsToken2;
        if (!decimals2) {
          let contractToken2 = new ethers.Contract(addressToken2, Erc20, provider);
          if (contractToken2 !== address0) {
            decimalsToken2 = await contractToken2.decimals();
            setDecimals1(decimalsToken2);
          } else {
            return;
          }
        } else {
          decimalsToken2 = decimals2;
        }
        // TOKEN2 = new Token(ChainId.MAINNET, addressToken2, decimalsToken2);
        TOKEN2 = new Token(ChainId.RINKEBY, addressToken2, decimalsToken2);
        setInstanceToken1SDK(TOKEN2);
        pairSDK = await Fetcher.fetchPairData(TOKEN1, TOKEN2);
      } else {
        TOKEN2 = instanceToken2SDK;
        pairSDK = await Fetcher.fetchPairData(TOKEN1, instanceToken2SDK);
      }
      const routeSDK = new Route([pairSDK], TOKEN1);
      setDecimals1(decimals1);
      setInstanceToken1SDK(TOKEN1);
      setInstanceRouteSDK(routeSDK);
    }
  }

  useEffect(() => {
    if (
      addressToken1 &&
      addressToken2 &&
      ethers.utils.isAddress(addressToken1) &&
      ethers.utils.isAddress(addressToken2)
    ) {
      setInstanceAndDecimalToken2();
    }
  }, [addressToken2, transactions]);

  async function setInstanceAndDecimalToken2() {
    let contractToken2 = new ethers.Contract(addressToken2, Erc20, provider);
    let addressPair = await factoryUNI.getPair(addressToken1, addressToken2);
    if (contractToken2.address !== address0 && addressPair !== address0) {
      setInstanceToken2(contractToken2);
      let decimals2 = await contractToken2.decimals();
      // const TOKEN2 = new Token(ChainId.MAINNET, addressToken2, decimals2);
      const TOKEN2 = new Token(ChainId.RINKEBY, addressToken2, decimals2);
      let pairSDK;
      let TOKEN1;
      if (!instanceToken1SDK) {
        let decimalsToken1;
        if (!decimals1) {
          let contractToken1 = new ethers.Contract(addressToken1, Erc20, provider);
          if (contractToken1 !== address0) {
            decimalsToken1 = await contractToken1.decimals();
            setDecimals1(decimalsToken1);
          } else {
            return;
          }
        } else {
          decimalsToken1 = decimals1;
        }
        // TOKEN1 = new Token(ChainId.MAINNET, addressToken1, decimalsToken1);
        TOKEN1 = new Token(ChainId.RINKEBY, addressToken1, decimalsToken1);
        setInstanceToken1SDK(TOKEN1);

        pairSDK = await Fetcher.fetchPairData(TOKEN1, TOKEN2);
      } else {
        TOKEN1 = instanceToken1SDK;
        pairSDK = await Fetcher.fetchPairData(instanceToken1SDK, TOKEN2);
      }
      const routeSDK = new Route([pairSDK], TOKEN1);
      setDecimals2(decimals2);
      setInstanceToken2SDK(TOKEN2);
      setInstanceRouteSDK(routeSDK);
    }
  }

  async function createInstancePair() {
    console.log('createInstancePair');
    let pair = await factoryUNI.getPair(addressToken1, addressToken2);
    if (pair !== address0) {
      setPair(pair);
      const pairContract = new ethers.Contract(pair, UniswapV2Pair, provider);
      setInstancePair(pairContract);
      let reverves = await pairContract.getReserves();
      setLiquidity1(parseFloat(ethers.utils.formatUnits(reverves[0], decimals1)).toFixed(3));
      setLiquidity2(parseFloat(ethers.utils.formatUnits(reverves[1], decimals2)).toFixed(3));
    }
  }

  async function updateLiquidity() {
    let reverves = await instancePair.getReserves();
    setLiquidity1(parseFloat(ethers.utils.formatUnits(reverves[0], decimals1)).toFixed(3));
    setLiquidity2(parseFloat(ethers.utils.formatUnits(reverves[1], decimals2)).toFixed(3));
  }

  return (
    <Spin spinning={loadingAutoSwap} tip={messageLoading}>
      <div className='swap-IDO-tool'>
        <div className='header'>
          <h1>Tool Follow IDO</h1>
        </div>
        <div className='content'>
          <Row>
            <Col xs={{ order: 3, span: 24 }} xl={{ order: 1, span: 9 }}>
              <LeftSwap
                setGas={setGasPrice}
                setGasPrice={setGasPrice}
                privateKey={privateKey}
                setPrivateKey={setPrivateKey}
                setbBlanceETH={setbBlanceETH}
                myTransactions={myTransactions}
                provider={provider}
              />
            </Col>
            <Col xs={{ order: 1, span: 24 }} xl={{ order: 2, span: 6 }}>
              <div className='box-2'>
                <div className='content-tracking'>
                  <div className='tracking-swap'>
                    <div className='swap-input'>
                      <div className='swap-input-token margin-top-bottom-12px'>
                        <div className='boder-input'>
                          <div className='label-input'>
                            <div className='content-label'>
                              <div className='text-label'>
                                {symbol1 ? symbol1 : 'Address Token 1'}
                              </div>
                            </div>
                          </div>
                          <div className='token-input'>
                            <input
                              className='input-token'
                              type='text'
                              value={addressToken1}
                              onChange={e => changeToken1(e)}
                            ></input>
                          </div>
                        </div>
                      </div>
                      <div className='display-icon-down margin-top-bottom-12px'>
                        <ArrowDownOutlined onClick={() => tokenSwapping()} />
                      </div>
                      <div className='swap-input-token margin-top-bottom-12px'>
                        <div className='boder-input'>
                          <div className='label-input'>
                            <div className='content-label'>
                              <div className='text-label'>
                                {symbol2 ? symbol2 : 'Address Token 2'}
                              </div>
                            </div>
                          </div>
                          <div className='token-input'>
                            <input
                              className='input-token'
                              type='text'
                              value={addressToken2}
                              onChange={e => changeToken2(e)}
                            ></input>
                          </div>
                        </div>
                      </div>
                      <div className='swap-input-token margin-top-bottom-12px'>
                        <div className='boder-input'>
                          <div className='label-input'>
                            <div className='content-label'>
                              <div className='text-label'>Amount</div>
                              <div
                                className='display-balance'
                                onClick={() =>
                                  setAmount(
                                    balanceETH -
                                      formartWeiToEth(gas) * formartWeiToEth(gasPrice) * 10e17 >
                                      0
                                      ? balanceETH -
                                          formartWeiToEth(gas) * formartWeiToEth(gasPrice) * 10e17
                                      : 0
                                  )
                                }
                              >
                                Balance: {balanceETH}
                              </div>
                            </div>
                          </div>
                          <div className='token-input'>
                            <Input
                              min={0.1}
                              step={0.1}
                              bordered={false}
                              className='input-token'
                              type='text'
                              value={amount}
                              onPressEnter={() => calcTrade()}
                              onBlur={() => calcTrade()}
                              onChange={e => changeAmount(e)}
                            ></Input>
                            <Button
                              type='primary'
                              shape='round'
                              className='button-max'
                              onClick={() =>
                                setAmount(
                                  balanceETH -
                                    formartWeiToEth(gas) * formartWeiToEth(gasPrice) * 10e17 >
                                    0
                                    ? balanceETH -
                                        formartWeiToEth(gas) * formartWeiToEth(gasPrice) * 10e17
                                    : 0
                                )
                              }
                            >
                              MAX
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className='display-slippage margin-top-bottom-12px'>
                        <div className='box-slippage'>
                          <div className='slippage-tolerance'>
                            <div className='text-slippage'>Slippage Tolerance</div>
                            <div className='slippage'>
                              <Input
                                size='small'
                                className='input-slippage'
                                onChange={e => changeSlippage(e)}
                                onBlur={() => calcTrade()}
                                onPressEnter={() => calcTrade()}
                                placeholder={slippage}
                              />
                              &nbsp;%
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className='swap-input-token margin-top-bottom-12px'>
                        <div className='boder-input'>
                          <div className='label-input'>
                            <div className='content-label'>
                              <div className='text-label'>Amount Out Require</div>
                              <div
                                className='display-balance'
                                onClick={() => setAmountOut(amountOutMin)}
                              >
                                Amount min:
                                {loadingSlippage ? (
                                  <span>
                                    &nbsp; &nbsp;
                                    <Spin indicator={antIcon} />
                                  </span>
                                ) : (
                                  amountOutMin
                                )}
                              </div>
                            </div>
                          </div>
                          <div className='token-input'>
                            <Input
                              min={0.1}
                              step={0.1}
                              bordered={false}
                              className='input-token'
                              type='text'
                              value={amountOut}
                              onChange={e => {
                                changeAmountOut(e);
                              }}
                            ></Input>
                          </div>
                        </div>
                      </div>
                      <div className='swap-group-amount-gas margin-top-bottom-12px'>
                        <Row justify='space-between'>
                          <Col span={11}>
                            <div className='swap-input-gas'>
                              <div className='boder-input'>
                                <div className='label-input'>
                                  <div className='content-label'>
                                    <div className='text-label'>Gas</div>
                                  </div>
                                </div>
                                <div className='token-input'>
                                  <input
                                    className='input-token'
                                    type='text'
                                    value={gas}
                                    onChange={e => changeGas(e)}
                                  ></input>
                                </div>
                              </div>
                            </div>
                          </Col>
                          <Col span={11}>
                            <div className='swap-input-gas-price'>
                              <div className='boder-input'>
                                <div className='label-input'>
                                  <div className='content-label'>
                                    <div className='text-label'>Gas Price</div>
                                  </div>
                                </div>
                                <div className='token-input'>
                                  <input
                                    className='input-token'
                                    type='text'
                                    value={gasPrice}
                                    onChange={e => changeGasPrice(e)}
                                  ></input>
                                </div>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </div>
                      <div className='display-fee margin-top-bottom-12px'>
                        <div className='box-slippage'>
                          <div className='box-fee'>
                            <span>
                              Fee: <b>{calcFee(gas, gasPrice)}</b>
                              <i>(Ether)</i>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className='button-start-swap'>
                      <button
                        className='button-swap'
                        disabled={addressToken1 && addressToken2 && privateKey ? false : true}
                        onClick={() => swapExactETHForTokens()}
                      >
                        <div className='text-button'>Swap</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={{ order: 2, span: 24 }} xl={{ order: 3, span: 9 }}>
              <RightSwap
                setGas={setGas}
                setGasPrice={setGasPrice}
                transactions={transactions}
                statusTracking={statusTracking}
                statusAutoSwap={statusAutoSwap}
                setStatusAutoSwap={setStatusAutoSwap}
                startTracking={startTracking}
                addressToken1={addressToken1}
                addressToken2={addressToken2}
                pair={pair}
                liquidity1={liquidity1}
                liquidity2={liquidity2}
              />
            </Col>
          </Row>
        </div>
      </div>
    </Spin>
  );
}

export default SwapTool;
