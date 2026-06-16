// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  MockUSDC
 * @notice Minimal ERC-20 token for Remix / testnet demos.
 *         Matches the Base Sepolia USDC interface (6 decimals, Transfer event).
 * @dev    NOT for production — anyone can mint.
 */
contract MockUSDC {
    string  public constant name     = "USD Coin";
    string  public constant symbol   = "USDC";
    uint8   public constant decimals = 6;

    uint256 public totalSupply;
    mapping(address => uint256)                     public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        _mint(msg.sender, 1_000_000 * 10 ** decimals);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "ERC20: insufficient allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /// @notice Open mint — for demo funding only
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "ERC20: insufficient balance");
        unchecked {
            balanceOf[from] -= amount;
            balanceOf[to]   += amount;
        }
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        unchecked {
            totalSupply    += amount;
            balanceOf[to]  += amount;
        }
        emit Transfer(address(0), to, amount);
    }
}
