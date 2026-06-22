// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  PaymentReceipt
 * @notice On-chain audit trail for x-gate AI agent decisions (pay AND skip).
 * @dev    Deploy via Remix on Base Sepolia — not part of the npm build chain.
 *
 * After deploy:
 *   agent/.env  →  PAYMENT_RECEIPT_ADDRESS=0x...
 *   web/.env.local  →  NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
 */
contract PaymentReceipt {
    event ReceiptIssued(
        address indexed payer,
        address indexed payee,
        uint256 amount,
        string memo,
        uint256 timestamp
    );

    address public immutable owner;

    constructor() {
        owner = msg.sender;
    }

    /**
     * @param payee   Recipient (gateway wallet for pay; zero address for skip)
     * @param amount  USDC base units (6 decimals); 0 for skip decisions
     * @param memo    Format: "pay|reason" or "skip|reason" (max 100 chars)
     */
    function issueReceipt(
        address payee,
        uint256 amount,
        string calldata memo
    ) external {
        emit ReceiptIssued(
            msg.sender,
            payee,
            amount,
            memo,
            block.timestamp
        );
    }
}
