import React from 'react';
import { SyncOutlined } from '@ant-design/icons';
import { Tag, Row, Col, Checkbox } from 'antd';
import { formatNumber } from 'utils/common';
import TableTransactions from 'component/TableTransactions';

function LeftSwap({
  setGas,
  setGasPrice,
  transactions,
  statusTracking,
  statusAutoSwap,
  setStatusAutoSwap,
  startTracking,
  addressToken1,
  addressToken2,
  pair,
  liquidity1,
  liquidity2
}) {
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
          parseFloat(liquidity1) === 0.0 &&
          parseFloat(liquidity2) === 0.0 ? (
            <Tag icon={<SyncOutlined spin />} color='processing'>
              Liquidity is not found...
            </Tag>
          ) : null}
          {statusTracking &&
          pair &&
          pair !== '0x0000000000000000000000000000000000000000' &&
          liquidity1 > 0 &&
          liquidity2 > 0 ? (
            <div className='show-liquidity'>
              <Tag color='orange'>
                <div>Amount 1: {formatNumber(liquidity1)} </div>
              </Tag>
              <Tag color='success'>
                <div>Amount 2: {formatNumber(liquidity2)} </div>
              </Tag>
            </div>
          ) : null}
          <div className='status-tracking-pair'></div>
        </Col>
      </Row>

      <div className='section-follow-transaction'>
        <div className='list-transactions'>
          <TableTransactions setGas={setGas} setGasPrice={setGasPrice} dataSource={transactions} />
        </div>
      </div>
    </div>
  );
}

export default LeftSwap;
