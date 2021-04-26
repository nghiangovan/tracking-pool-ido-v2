import React, { useEffect, useState } from 'react';
import './style.scss';
import useInterval from 'utils/useInterval';
import InputDataDecoder from 'ethereum-input-data-decoder';
import { message, Input, Row, Col, Button, Spin } from 'antd';
import { ArrowDownOutlined, LoadingOutlined } from '@ant-design/icons';
import UniswapV2Pair from 'contracts/UniswapV2Pair.json';
import Erc20 from 'contracts/Erc20.json';
import UniswapV2Router02 from 'contracts/UniswapRouterV2.json';
import { ethers } from 'ethers';
import { formartWeiToEth, calcFee, calcAmountOut } from 'utils/common';
import { factoryUNI } from 'utils/factoryUNI';
import { provider, providerListen, address_app } from 'utils/provider';
import LeftSwap from './LeftSwap';
import RightSwap from './RightSwap';

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;
const addressNull = '0x0000000000000000000000000000000000000000';
const decoder = new InputDataDecoder(UniswapV2Router02);

function SwapTool() {
  const [transactions, setTransactions] = useState([]);
  const [myTransactions, setMyTransactions] = useState([]);
  const [gasPrice, setGasPrice] = useState(180000000000);
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
  const [statusAutoSwap, setStatusAutoSwap] = useState(true);
  const [loadingSlippage, setLoadingSlippage] = useState(false);
  const [priceETH, setPiceETH] = useState(null);
  const [gasLimit, setGasLimit] = useState(null);
  const [disabledSwapAuto, setDisabledSwapAuto] = useState(false);
  const [delayIntervalGetPair, setDelayIntervalGetPair] = useState(null);
  const [intanceToken1, setIntanceToken1] = useState();
  // const [walletsHolding, setWalletsHolding] = useState();

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
        if ((await provider.getCode(token1)) !== '0x') {
          let contract = new ethers.Contract(token1, Erc20, provider);
          setSymbol1(await contract.symbol());
          setDecimals1(await contract.decimals());
          setIntanceToken1(contract);
        } else {
          message.error('Token1 Not Found');
        }
      }
      let token0 = localStorage.getItem('token0');
      if (ethers.utils.isAddress(token0)) {
        setAddressToken0(token0);
        if ((await provider.getCode(token0)) !== '0x') {
          let contract = new ethers.Contract(token0, Erc20, provider);
          setSymbol0(await contract.symbol());
          setDecimals0(await contract.decimals());
        } else {
          message.error('Token0 Not Found');
        }
      }
    }
    loadAddressLocalStorage();
  }, []);

  async function startTracking() {
    console.log('Start Tracking');
    setStatusTracking(true);
    let pair = await factoryUNI.getPair(addressToken0, addressToken1);
    if (pair !== addressNull) {
      const pairContract = new ethers.Contract(pair, UniswapV2Pair, provider);
      let reverves = await pairContract.getReserves();
      if (parseFloat(reverves[1]) === 0.0) {
        createInstancePair();
        setStatusAutoSwap(true);
        setDisabledSwapAuto(false);
        listenAddliquidity('tracking balance...');
        return;
      }
    } else {
      setPair(addressNull);
      setStatusAutoSwap(true);
      setDisabledSwapAuto(false);
      listenAddliquidity('tracking pair...');
      return;
    }
    setPair(pair);
    console.log('pair', pair);
    createInstancePair();
    setStatusAutoSwap(false);
    setDisabledSwapAuto(true);
    message.success('Start Tracking');
    let filter = {
      address: pair,
      topics: [ethers.utils.id('Swap(address,uint256,uint256,uint256,uint256,address)')]
    };
    provider.on(filter, async event => {
      await updateListTransaction(event);
    });
  }

  useInterval(async () => {}, 15000);

  function listenAddliquidity(statusMessage) {
    const listenTransactions = providerListen.on('pending', async txtHash => {
      console.log(statusMessage);
      try {
        let tx = await providerListen.getTransaction(txtHash);
        if (tx && tx.to) {
          if (
            tx.to.toLowerCase() ===
            address_app[process.env.REACT_APP_CHAIN_ID].routerAddress.toLocaleLowerCase()
          ) {
            let dDecode = decoder.decodeData(tx.data);
            if (
              dDecode.method === 'addLiquidityETH' &&
              `0x${dDecode.inputs[0].toLocaleLowerCase()}` === addressToken1.toLocaleLowerCase()
            ) {
              console.log('tx listen:', tx);
              console.log('inputData listen:', dDecode);
              let balanceOf = await intanceToken1.balanceOf(tx.from);
              console.log(
                parseInt(balanceOf),
                parseInt(dDecode.inputs[1]),
                parseInt(balanceOf) >= parseInt(dDecode.inputs[1])
              );
              if (parseInt(balanceOf) >= parseInt(dDecode.inputs[1])) {
                await swapExactETHForTokens(tx.gasPrice.toString());
                await listenTransactions.destroy();
                setDelayIntervalGetPair(1000);
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    });
  }
  useInterval(async () => {
    let pair = await factoryUNI.getPair(addressToken0, addressToken1);
    if (pair !== addressNull) {
      setPair(pair);
      await startTracking();
      setDelayIntervalGetPair(null);
    }
  }, delayIntervalGetPair);

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

  async function swapExactETHForTokens(gasPriceListen) {
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
      gasLimit: gasLimit,
      gasPrice: gasPriceListen ? gasPriceListen : gasPrice,
      value: ethers.utils.parseEther(amount.toString())
    };
    let swap = await router.swapExactETHForTokens(
      ethers.utils.parseEther(amountOutRequired.toString()),
      [addressToken0, addressToken1],
      wallet.address,
      deadline,
      overrideOptions
    );
    message.success(swap.hash);
    // swap['timestamp'] = '';
    swap['key'] = swap.hash;
    console.log('tx swap: ', swap);
    setMyTransactions(myTransactions => [swap, ...myTransactions]);
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
    if (ethers.utils.isAddress(value) && (await provider.getCode(value)) !== '0x') {
      let contract = new ethers.Contract(value, Erc20, provider);
      setSymbol0(await contract.symbol());
      setDecimals0(await contract.decimals());
      if (ethers.utils.isAddress(addressToken0)) {
        const pairAddress = await factoryUNI.getPair(contract.address, addressToken1);
        if (pairAddress !== addressNull) {
          setPair(pairAddress);
          const pairContract = new ethers.Contract(pairAddress, UniswapV2Pair, provider);
          setInstancePair(pairContract);
        }
      }
    } else {
      message.error('Token0 Not Found');
    }
  }
  async function changeToken1(e) {
    const { value } = e.target;
    setAddressToken1(value);
    localStorage.setItem('token1', value);
    if (ethers.utils.isAddress(value) && (await provider.getCode(value)) !== '0x') {
      let contract = new ethers.Contract(value, Erc20, provider);
      setSymbol1(await contract.symbol());
      setDecimals1(await contract.decimals());
      setIntanceToken1(contract);
      if (ethers.utils.isAddress(addressToken1)) {
        const pairAddress = await factoryUNI.getPair(addressToken0, contract.address);
        if (pairAddress !== addressNull) {
          setPair(pairAddress);
          const pairContract = new ethers.Contract(pairAddress, UniswapV2Pair, provider);
          setInstancePair(pairContract);
        }
      }
    } else {
      message.error('Token1 Not Found');
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

  useEffect(() => {
    async function calcFee() {
      const reg = /^[+-]?\d+(\.\d+)?$/;
      if (!addressToken0 || !addressToken1 || (isNaN(gasPrice) && !reg.test(gasPrice))) {
        return;
      }
      try {
        let router = new ethers.Contract(
          address_app[process.env.REACT_APP_CHAIN_ID].routerAddress,
          UniswapV2Router02,
          provider
        );
        let deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        var overrideOptions = {
          gasPrice: gasPrice && gasPrice !== '' && gasPrice > 0 ? gasPrice : 0,
          value: 1000
        };
        let gasLimit = await router.estimateGas.swapExactETHForTokens(
          100,
          [addressToken0, addressToken1],
          '0x32FEecCD73bc3e2c2DaE2442602f28894499A4a4',
          deadline,
          overrideOptions
        );
        console.log('Gas Limit: ', parseInt(gasLimit));
        setGasLimit(parseInt(gasLimit));
      } catch (error) {
        console.log(error);
        setGasLimit(400000);
      }
    }
    calcFee();
  }, [amount, gasPrice, amountOutRequired, addressToken0, addressToken1]);

  return (
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
                                    formartWeiToEth(gasLimit) * formartWeiToEth(gasPrice) * 10e17 >
                                    0
                                    ? balanceETH -
                                        formartWeiToEth(gasLimit) *
                                          formartWeiToEth(gasPrice) *
                                          10e17
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
                                  formartWeiToEth(gasLimit) * formartWeiToEth(gasPrice) * 10e17 >
                                  0
                                  ? balanceETH -
                                      formartWeiToEth(gasLimit) * formartWeiToEth(gasPrice) * 10e17
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
                            Fee: <b>{calcFee(gasLimit, gasPrice)}</b>
                            <i>(Ether)</i> -{' '}
                            <b>{parseFloat(calcFee(gasLimit, gasPrice) * priceETH).toFixed(3)}</b>
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
                        balanceETH > calcFee(gasLimit, gasPrice)
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
              disabledSwapAuto={disabledSwapAuto}
              privateKey={privateKey}
              priceETH={priceETH}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default SwapTool;
