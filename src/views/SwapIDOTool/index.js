import React, { useEffect, useState } from 'react';
import './style.scss';
import useInterval from 'utils/useInterval';
import { message, Input, Row, Col, Button, Spin } from 'antd';
import { ArrowDownOutlined, LoadingOutlined } from '@ant-design/icons';
import UniswapV2Pair from 'contracts/UniswapV2Pair.json';
import Erc20 from 'contracts/Erc20.json';
import UniswapV2Router02 from 'contracts/UniswapRouterV2.json';
import { ethers } from 'ethers';
import { formartWeiToEth, calcFee, calcAmountOut } from 'utils/common';
import { factoryUNI } from 'utils/factoryUNI';
import { provider, address_app } from 'utils/provider';
import LeftSwap from './LeftSwap';
import RightSwap from './RightSwap';

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;
const addressNull = '0x0000000000000000000000000000000000000000';
const gas = 300000;

function SwapTool() {
  const [transactions, setTransactions] = useState([]);
  const [myTransactions, setMyTransactions] = useState([]);
  const [gasPrice, setGasPrice] = useState(44000000000);
  const [statusTracking, setStatusTracking] = useState(false);
  const [addressToken0, setAddressToken0] = useState(
    address_app[process.env.REACT_APP_CHAIN_ID].WETH
  );
  const [balanceETH, setbBlanceETH] = useState(0);
  const [addressToken1, setAddressToken1] = useState('');
  const [pair, setPair] = useState(null);
  const [liquidity0, setLiquidity0] = useState(0);
  const [liquidity1, setLiquidity1] = useState(0);
  const [amount, setAmount] = useState(0.1);
  const [amountOutRequired, setAmountOutRequired] = useState(0);
  const [privateKey, setPrivateKey] = useState(process.env.REACT_APP_PRIVATE_KEY);
  const [slippage, setSlippage] = useState(0);
  const [instancePair, setInstancePair] = useState(null);
  const [amountOutMin, setAmountMin] = useState(0);
  const [decimals0, setDecimals0] = useState();
  const [decimals1, setDecimals1] = useState(null);
  const [symbol0, setSymbol0] = useState('WETH');
  const [symbol1, setSymbol1] = useState();
  const [trackPair, setTrackPair] = useState(null);
  const [trackBal, setTrackBal] = useState(null);
  const [statusAutoSwap, setStatusAutoSwap] = useState(true);
  const [loadingSlippage, setLoadingSlippage] = useState(false);
  const [currentBlock, setCurrentBlock] = useState(null);
  const [messageLoading, setMessageLoading] = useState('');
  const [loadingAutoSwap, setLoadingAutoSwap] = useState(false);
  const [priceETH, setPiceETH] = useState(null);

  useEffect(() => {
    async function fetchPrice() {
      let res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
      let obj = await res.json();
      let tokenPrice = parseInt(obj.price);
      console.log('price ETH: ', tokenPrice);
      setPiceETH(tokenPrice);
    }
    fetchPrice();

    async function getBalanceETH() {
      try {
        let wallet = new ethers.Wallet(privateKey, provider);
        let balance = await wallet.getBalance();
        if (balance > 0) {
          setbBlanceETH(parseFloat(formartWeiToEth(balance)).toFixed(5));
        }
      } catch (e) {
        setbBlanceETH(0);
      }
    }
    if (privateKey) {
      getBalanceETH();
    }

    async function loadAddressLocalStorage() {
      let amount = parseFloat(localStorage.getItem('amount'));
      if (amount > 0) {
        setAmount(amount);
      }

      let amountOutRequired = parseFloat(localStorage.getItem('amountOutRequired'));
      if (amountOutRequired > 0) {
        setAmountOutRequired(amountOutRequired);
      }

      let slippage = parseFloat(localStorage.getItem('slippage'));
      if (slippage > 0) {
        setSlippage(slippage);
      }

      let token1 = localStorage.getItem('token1');
      if (ethers.utils.isAddress(token1)) {
        setAddressToken1(token1);
        let contract = new ethers.Contract(token1, Erc20, provider);
        if (contract.address !== addressNull) {
          setSymbol1(await contract.symbol());
          setDecimals1(await contract.decimals());
        }
      }
      let token0 = localStorage.getItem('token0');
      if (ethers.utils.isAddress(token0)) {
        setAddressToken0(token0);
        let contract = new ethers.Contract(token0, Erc20, provider);
        if (contract.address !== addressNull) {
          setSymbol1(await contract.symbol());
          setDecimals1(await contract.decimals());
        }
      }
    }
    loadAddressLocalStorage();
  }, []);

  useInterval(async () => {
    console.log('tracking balance...');
    if (instancePair && pair !== addressNull) {
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
    let pair = await factoryUNI.getPair(addressToken0, addressToken1);
    setPair(pair);
    setAmountMin(0);
    if (pair !== addressNull) {
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

  async function createInstancePair() {
    console.log('createInstancePair');
    let pair = await factoryUNI.getPair(addressToken0, addressToken1);
    if (pair !== addressNull) {
      setPair(pair);
      const pairContract = new ethers.Contract(pair, UniswapV2Pair, provider);
      setInstancePair(pairContract);
      let reverves = await pairContract.getReserves();
      let token0 =
        (await pairContract.token0()).toString().toLowerCase() ===
        addressToken0.toString().toLowerCase()
          ? await pairContract.token0()
          : await pairContract.token1();
      const contractToken0 = new ethers.Contract(token0, Erc20, provider);
      setDecimals0(await contractToken0.decimals());

      let token1 =
        (await pairContract.token1()).toString().toLowerCase() ===
        addressToken1.toString().toLowerCase()
          ? await pairContract.token1()
          : await pairContract.token0();
      const contractToken1 = new ethers.Contract(token1, Erc20, provider);
      setDecimals1(await contractToken1.decimals());
      let indexToken0 =
        (await pairContract.token0()).toString().toLowerCase() ===
        addressToken0.toString().toLowerCase()
          ? 0
          : 1;
      setLiquidity0(
        parseFloat(ethers.utils.formatUnits(reverves[indexToken0], decimals0)).toFixed(3)
      );
      let indexToken1 =
        (await pairContract.token1()).toString().toLowerCase() ===
        addressToken1.toString().toLowerCase()
          ? 1
          : 0;
      setLiquidity1(
        parseFloat(ethers.utils.formatUnits(reverves[indexToken1], decimals1)).toFixed(3)
      );
    }
  }

  async function updateLiquidity() {
    let reverves = await instancePair.getReserves();
    let indexToken0 =
      (await instancePair.token0()).toString().toLowerCase() ===
      addressToken0.toString().toLowerCase()
        ? 0
        : 1;
    setLiquidity0(
      parseFloat(ethers.utils.formatUnits(reverves[indexToken0], decimals0)).toFixed(3)
    );
    let indexToken1 =
      (await instancePair.token1()).toString().toLowerCase() ===
      addressToken1.toString().toLowerCase()
        ? 1
        : 0;
    setLiquidity1(
      parseFloat(ethers.utils.formatUnits(reverves[indexToken1], decimals1)).toFixed(3)
    );
  }

  async function calcTrade() {
    setLoadingSlippage(true);
    if (
      !addressToken0 ||
      !addressToken1 ||
      slippage > 50 ||
      amount <= 0 ||
      !statusTracking ||
      liquidity0 < 0 ||
      liquidity1 < 0
    ) {
      setLoadingSlippage(false);
      return;
    }
    setAmountMin(calcAmountOut(liquidity0, liquidity1, amount, slippage));
    setLoadingSlippage(false);
  }

  useEffect(() => {
    calcTrade();
  }, [transactions, instancePair, liquidity0, liquidity1]);
  useEffect(() => {
    if (statusTracking && instancePair && pair !== addressNull) {
      updateLiquidity();
    }
  }, [transactions, instancePair, addressToken1, addressToken0, pair]);

  async function swapExactETHForTokens() {
    let wallet = new ethers.Wallet(privateKey, provider);
    let router = new ethers.Contract(
      address_app[process.env.REACT_APP_CHAIN_ID].routerAddress,
      UniswapV2Router02,
      wallet
    );
    let deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    if (!addressToken0 || !addressToken1) {
      message.error('Please fill up token address');
      return;
    }
    var overrideOptions = {
      gasPrice: gasPrice,
      value: ethers.utils.parseEther(amount.toString()).toString()
    };
    let swap = await router.swapExactETHForTokens(
      ethers.utils.parseEther(amountOutRequired.toString()).toString(),
      [addressToken0, addressToken1],
      wallet.address,
      deadline,
      overrideOptions
    );
    message.success(swap.hash);
    // swap['timestamp'] = '';
    swap['key'] = swap.hash;
    console.log(swap);
    setMyTransactions(myTransactions => [swap, ...myTransactions]);
  }

  async function startTracking() {
    console.log('Start Tracking');
    setStatusTracking(true);
    let pair = await factoryUNI.getPair(addressToken0, addressToken1);
    if (pair !== addressNull) {
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
    createInstancePair();
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

  function changeGasPrice(e) {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '') {
      setGasPrice(value);
    }
  }
  async function changeToken0(e) {
    const { value } = e.target;
    localStorage.setItem('token0', value);
    setAddressToken0(value);
    if (ethers.utils.isAddress(value)) {
      let contract = new ethers.Contract(value, Erc20, provider);
      if (contract.address !== addressNull) {
        setSymbol0(await contract.symbol());
        setDecimals0(await contract.decimals());
        if (ethers.utils.isAddress(addressToken0)) {
          const pairAddress = await factoryUNI.getPair(value, addressToken1);
          if (pairAddress !== addressNull) {
            setPair(pairAddress);
            const pairContract = new ethers.Contract(pair, UniswapV2Pair, provider);
            setInstancePair(pairContract);
          }
        }
      }
    }
  }
  async function changeToken1(e) {
    const { value } = e.target;
    setAddressToken1(value);
    localStorage.setItem('token1', value);
    if (ethers.utils.isAddress(value)) {
      let contract = new ethers.Contract(value, Erc20, provider);
      if (contract.address !== addressNull) {
        setSymbol1(await contract.symbol());
        setDecimals1(await contract.decimals());
        if (ethers.utils.isAddress(addressToken1)) {
          const pairAddress = await factoryUNI.getPair(addressToken0, value);
          if (pairAddress !== addressNull) {
            setPair(pairAddress);
            const pairContract = new ethers.Contract(pair, UniswapV2Pair, provider);
            setInstancePair(pairContract);
          }
        }
      }
    }
  }
  function changeAmount(e) {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '') {
      setAmount(value);
      localStorage.setItem('amount', value);
    }
  }
  function changeAmountOutRequired(e) {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '') {
      setAmountOutRequired(value);
      localStorage.setItem('amountOutRequired', value);
    }
  }
  function changeSlippage(e) {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '') {
      setSlippage(value);
      localStorage.setItem('slippage', value);
    }
  }
  function tokenSwapping() {
    let address1 = addressToken0;
    setAddressToken0(addressToken1);
    setAddressToken1(address1);
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
                setGasPrice={setGasPrice}
                privateKey={privateKey}
                setPrivateKey={setPrivateKey}
                setbBlanceETH={setbBlanceETH}
                myTransactions={myTransactions}
                provider={provider}
                amount={amount}
              />
            </Col>
            <Col xs={{ order: 2, span: 24 }} xl={{ order: 2, span: 6 }}>
              <div className='box-2'>
                <div className='content-tracking'>
                  <div className='tracking-swap'>
                    <div className='swap-input'>
                      <div className='swap-input-token margin-top-bottom-12px'>
                        <div className='boder-input'>
                          <div className='label-input'>
                            <div className='content-label'>
                              <div className='text-label'>
                                {symbol0 ? symbol0 : 'Address Token 0'}
                              </div>
                            </div>
                          </div>
                          <div className='token-input'>
                            <input
                              className='input-token'
                              type='text'
                              value={addressToken0}
                              onChange={e => changeToken0(e)}
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
                                Balance(ETH): {balanceETH}
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
                      <div className='swap-group-amount-gas margin-top-bottom-12px'>
                        <Row justify='space-between'>
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
                          <Col span={11}>
                            <div className='swap-input-slippage'>
                              <div className='boder-input'>
                                <div className='label-input'>
                                  <div className='content-label'>
                                    <div className='text-label'>Slippage Tolerance</div>
                                  </div>
                                </div>
                                <div className='token-input'>
                                  <Input
                                    className='input-token'
                                    bordered={false}
                                    size='small'
                                    onChange={e => changeSlippage(e)}
                                    onBlur={() => calcTrade()}
                                    onPressEnter={() => calcTrade()}
                                    placeholder={slippage}
                                  />
                                </div>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </div>
                      <div className='swap-input-token margin-top-bottom-12px'>
                        <div className='boder-input'>
                          <div className='label-input'>
                            <div className='content-label'>
                              <div className='text-label'>Amount Out Require</div>
                              <div
                                className='display-balance'
                                onClick={() => setAmountOutRequired(amountOutMin)}
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
                              value={amountOutRequired}
                              onChange={e => {
                                changeAmountOutRequired(e);
                              }}
                            ></Input>
                          </div>
                        </div>
                      </div>
                      <div className='display-fee margin-top-bottom-12px'>
                        <div className='box-slippage'>
                          <div className='box-fee'>
                            <span>
                              Fee: <b>{calcFee(gas, gasPrice)}</b>
                              <i>(Ether)</i> -{' '}
                              <b>{parseFloat(calcFee(gas, gasPrice) * priceETH).toFixed(3)}</b>
                              ($)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className='button-start-swap'>
                      <button
                        className='button-swap'
                        disabled={
                          addressToken0 &&
                          addressToken1 &&
                          ethers.utils.isAddress(addressToken0) &&
                          ethers.utils.isAddress(addressToken0) &&
                          instancePair &&
                          privateKey &&
                          balanceETH > calcFee(gas, gasPrice)
                            ? false
                            : true
                        }
                        onClick={() => swapExactETHForTokens()}
                      >
                        <div className='text-button'>Swap</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={{ order: 1, span: 24 }} xl={{ order: 3, span: 9 }}>
              <RightSwap
                setGasPrice={setGasPrice}
                transactions={transactions}
                statusTracking={statusTracking}
                statusAutoSwap={statusAutoSwap}
                setStatusAutoSwap={setStatusAutoSwap}
                startTracking={startTracking}
                addressToken0={addressToken0}
                addressToken1={addressToken1}
                pair={pair}
                liquidity0={liquidity0}
                liquidity1={liquidity1}
                amount={amount}
                symbol0={symbol0}
                symbol1={symbol1}
                setAmountOutRequired={setAmountOutRequired}
              />
            </Col>
          </Row>
        </div>
      </div>
    </Spin>
  );
}

export default SwapTool;
