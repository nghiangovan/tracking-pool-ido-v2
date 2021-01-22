import React from 'react';
import { Row, Col, Input } from 'antd';
import { ethers } from 'ethers';
import { formartWeiToEth } from 'utils/common';
import TableTransactions from 'component/TableTransactions';

function LeftSwap({
  setGasPrice,
  privateKey,
  setPrivateKey,
  setbBlanceETH,
  myTransactions,
  provider
}) {
  async function changePrivateKey(e) {
    const { value } = e.target;
    setPrivateKey(value);
    try {
      let wallet = new ethers.Wallet(value, provider);
      let balance = await wallet.getBalance();
      if (balance > 0) {
        setbBlanceETH(parseFloat(formartWeiToEth(balance)));
      }
    } catch (e) {
      setbBlanceETH(0);
    }
  }
  return (
    <div className='box-1'>
      <Row justify='space-around' align='middle'>
        <Col span={12}>
          <h2>My Transactions</h2>
        </Col>
        <Col span={12}>
          <div className='swap-input-token'>
            <div className='boder-input '>
              <div className='token-input'>
                <Input.Password
                  placeholder='Private Key'
                  className='input-token'
                  bordered={false}
                  value={privateKey}
                  onChange={e => changePrivateKey(e)}
                />
              </div>
            </div>
          </div>
        </Col>
      </Row>
      <div className='section-follow-my-transaction'>
        <div className='list-transactions'>
          <TableTransactions setGasPrice={setGasPrice} dataSource={myTransactions} />
        </div>
      </div>
    </div>
  );
}

export default LeftSwap;
