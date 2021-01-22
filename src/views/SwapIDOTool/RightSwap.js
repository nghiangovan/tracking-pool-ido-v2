import React, { useState, useEffect } from 'react';
import { SyncOutlined } from '@ant-design/icons';
import { Tag, Row, Col, Checkbox, Input } from 'antd';
import { formatNumber, calcAmountOut } from 'utils/common';
// import TableTransactions from 'component/TableTransactions';

function RightSwap({
  statusTracking,
  statusAutoSwap,
  setStatusAutoSwap,
  startTracking,
  addressToken1,
  addressToken2,
  pair,
  liquidity1,
  liquidity2,
  amount
}) {
  const [liquid1, setLiquid1] = useState(0);
  const [liquid2, setLiquid2] = useState(0);
  const [minOut, setMinOut] = useState(0);

  function calc() {
    console.log('amount', amount);
    if (liquid1 === 0 || liquid2 === 0 || !amount) {
      return;
    }
    let out = calcAmountOut(liquid1, liquid2, amount);
    setMinOut(out);
  }

  function changeLiquid1(e) {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '') {
      setLiquid1(value);
    }
  }

  function changeLiquid2(e) {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '') {
      setLiquid2(value);
    }
  }

  return (
    <div className='box-3'>
      <Row justify='space-around' align='middle'>
        <Col span={12}>
          <div className='button-start-tracking'>
            <button
              className='button-start'
              onClick={() => startTracking()}
              disabled={addressToken1 && addressToken2 ? false : true}
            >
              <div className='text-button'>Start</div>
            </button>
            <Checkbox onChange={e => setStatusAutoSwap(e.target.checked)} checked={statusAutoSwap}>
              Auto Swap
            </Checkbox>
          </div>
        </Col>
        <Col span={12} className='status-tracking-pair'>
          <h2>Other Transactions {statusTracking ? <SyncOutlined spin /> : null}</h2>
          {statusTracking && pair === '0x0000000000000000000000000000000000000000' ? (
            <div className='status-tracking-pair'>
              <Tag color='warning'>Pair hasn't exist yet ...</Tag>
            </div>
          ) : null}
          {statusTracking &&
          pair &&
          pair !== '0x0000000000000000000000000000000000000000' &&
          parseFloat(liquidity1.amount) === 0.0 &&
          parseFloat(liquidity2.amount) === 0.0 ? (
            <Tag icon={<SyncOutlined spin />} color='processing'>
              Liquidity is not found...
            </Tag>
          ) : null}
          {statusTracking &&
          pair &&
          pair !== '0x0000000000000000000000000000000000000000' &&
          liquidity1.amount > 0 &&
          liquidity2.amount > 0 ? (
            <div className='show-liquidity'>
              <Tag color='orange'>
                <div>
                  {liquidity1.symbol}: {formatNumber(liquidity1.amount)}
                </div>
              </Tag>
              <Tag color='success'>
                <div>
                  {liquidity2.symbol}: {formatNumber(liquidity2.amount)}
                </div>
              </Tag>
            </div>
          ) : null}
          <div className='status-tracking-pair'></div>
        </Col>
      </Row>

      <div className='section-follow-transaction'>
        <div className='list-transactions'>
          <p>Liquidity1</p>
          <Input
            type='text'
            value={liquid1}
            onPressEnter={() => calc()}
            onBlur={() => calc()}
            onChange={e => changeLiquid1(e)}
          ></Input>
          <p>Liquidity2</p>
          <Input
            type='text'
            value={liquid2}
            onPressEnter={() => calc()}
            onBlur={() => calc()}
            onChange={e => changeLiquid2(e)}
          ></Input>
          <h2>Amount Min: {minOut}</h2>
          {/* <TableTransactions setGas={setGas} setGasPrice={setGasPrice} dataSource={transactions} /> */}
        </div>
      </div>
    </div>
  );
}

export default RightSwap;
