import React, { useState } from 'react';
import { SyncOutlined } from '@ant-design/icons';
import { Tag, Row, Col, Checkbox, Input } from 'antd';
import { formatNumber, calcAmountOut } from 'utils/common';
// import TableTransactions from 'component/TableTransactions';

function RightSwap({
  statusTracking,
  statusAutoSwap,
  setStatusAutoSwap,
  startTracking,
  addressToken0,
  addressToken1,
  pair,
  liquidity0,
  liquidity1,
  amount,
  symbol0,
  symbol1,
  setAmountOutRequired,
  disabledSwapAuto,
  privateKey
}) {
  const [liquid0, setLiquid1] = useState(0);
  const [liquid1, setLiquid2] = useState(0);
  const [minOut, setMinOut] = useState(0);

  function calc() {
    if (liquid0 === 0 || liquid1 === 0 || !amount) {
      return;
    }
    let out = calcAmountOut(liquid0, liquid1, amount, 0);
    setMinOut(out);
  }

  function changeLiquid1(e) {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '') {
      setLiquid1(value);
      calc();
    }
  }

  function changeLiquid2(e) {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '') {
      setLiquid2(value);
      calc();
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
              disabled={addressToken0 && addressToken1 && privateKey ? false : true}
            >
              <div className='text-button'>Start</div>
            </button>
            <Checkbox
              onChange={e => setStatusAutoSwap(e.target.checked)}
              checked={statusAutoSwap}
              disabled={disabledSwapAuto}
            >
              Auto Swap
            </Checkbox>
          </div>
        </Col>
        <Col span={12} className='status-tracking-pair'>
          <h2>Status Pair {statusTracking ? <SyncOutlined spin /> : null}</h2>
          {statusTracking && pair === '0x0000000000000000000000000000000000000000' ? (
            <div className='status-tracking-pair'>
              <Tag color='warning'>Pair hasn't exist yet ...</Tag>
            </div>
          ) : null}
          {statusTracking &&
          pair &&
          pair !== '0x0000000000000000000000000000000000000000' &&
          parseFloat(liquidity0) === 0.0 &&
          parseFloat(liquidity1) === 0.0 ? (
            <Tag icon={<SyncOutlined spin />} color='processing'>
              Liquidity is not found...
            </Tag>
          ) : null}
          {statusTracking &&
          pair &&
          pair !== '0x0000000000000000000000000000000000000000' &&
          liquidity0 > 0 &&
          liquidity1 > 0 ? (
            <div className='show-liquidity'>
              <Tag color='orange'>
                <div>
                  {symbol0}: {formatNumber(liquidity0)}
                </div>
              </Tag>
              <Tag color='success'>
                <div>
                  {symbol1}: {formatNumber(liquidity1)}
                </div>
              </Tag>
            </div>
          ) : null}
          <div className='status-tracking-pair'></div>
        </Col>
      </Row>

      <div className='section-follow-transaction'>
        <div className='list-transactions'>
          <div className='calc-amount-min'>
            <h2>Calculator</h2>
            <p>
              <i>( Guess amount min when pair was not listed yet )</i>
            </p>
            <label>Liquidity 1</label>
            <Input
              type='text'
              value={liquid0}
              onChange={e => changeLiquid1(e)}
              onBlur={() => calc()}
              onPressEnter={() => calc()}
            ></Input>
            <label>Liquidity 2</label>
            <Input
              type='text'
              value={liquid1}
              onChange={e => changeLiquid2(e)}
              onBlur={() => calc()}
              onPressEnter={() => calc()}
            ></Input>
            <h2 className='result-amount-min'>
              Amount Min:
              <b
                className='cursor-pointer'
                onClick={() => setAmountOutRequired(parseFloat(minOut).toFixed(5))}
              >
                {parseFloat(minOut).toFixed(5)}
              </b>
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RightSwap;
