import React from 'react';
import { Table, Tag } from 'antd';
import prettyMilliseconds from 'pretty-ms';
import { formartWeiToGwei } from 'utils/common';
import etherscan from 'assets/images/etherscan.png';

function TableTransactions({ setGas, setGasPrice, dataSource }) {
  const columns = [
    {
      title: 'Hash',
      dataIndex: 'hash',
      key: 'hash',
      render: hash => (
        // <a href={`https://etherscan.io/tx/${hash}`} target='_blank' rel='noopener noreferrer'>
        <a
          href={`https://rinkeby.etherscan.io/tx/${hash}`}
          target='_blank'
          rel='noopener noreferrer'
        >
          {hash.substring(0, 6)}...
          <div>
            &nbsp;&nbsp;&nbsp;&nbsp;
            <img src={etherscan} width='18' alt='icon-etherscan' />
          </div>
        </a>
      )
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: timestamp => {
        return timestamp
          ? prettyMilliseconds(Math.floor(new Date().getTime()) - timestamp * 1000, {
              compact: true
            })
          : '';
      }
    },
    {
      title: 'Gas Limit',
      dataIndex: 'gasLimit',
      key: 'gasLimit',
      render: gasLimit => (
        <Tag
          color='processing'
          onClick={() => setGas(parseInt(gasLimit))}
          className='cursor-pointer'
        >
          {parseInt(gasLimit)}
        </Tag>
      )
    },
    {
      title: 'Gas Price',
      dataIndex: 'gasPrice',
      key: 'gasPrice',
      render: gasPrice => (
        <Tag
          color='warning'
          onClick={() => setGasPrice(parseInt(gasPrice))}
          className='cursor-pointer'
        >
          {formartWeiToGwei(gasPrice)}
          <span style={{ fontSize: '9px' }}>(Gwei)</span>
        </Tag>
      )
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      size='small'
      pagination={{
        pageSize: 9
      }}
    />
  );
}

export default TableTransactions;
