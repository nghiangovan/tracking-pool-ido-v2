import React from 'react';
import { Table, Tag } from 'antd';
// import prettyMilliseconds from 'pretty-ms';
import { formartWeiToEth, formartWeiToGwei } from 'utils/common';
import etherscan from 'assets/images/etherscan.png';

const urlEtherScan = {
  1: `https://etherscan.io/tx`,
  3: `https://ropsten.etherscan.io/tx`,
  4: `https://rinkeby.etherscan.io/tx`
};

function TableTransactions({ setGasPrice, dataSource }) {
  const columns = [
    {
      title: 'Hash',
      dataIndex: 'hash',
      key: 'hash',
      render: hash => (
        <a
          href={`${urlEtherScan[process.env.REACT_APP_CHAIN_ID]}/${hash}`}
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
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: value => {
        return formartWeiToEth(parseInt(value));
      }
    },
    // {
    //   title: 'Timestamp',
    //   dataIndex: 'timestamp',
    //   key: 'timestamp',
    //   render: timestamp => {
    //     return timestamp
    //       ? prettyMilliseconds(Math.floor(new Date().getTime()) - timestamp * 1000, {
    //           compact: true
    //         })
    //       : '';
    //   }
    // },
    {
      title: 'Gas Limit',
      dataIndex: 'gasLimit',
      key: 'gasLimit',
      render: gasLimit => (
        <Tag color='processing' className='cursor-pointer'>
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
