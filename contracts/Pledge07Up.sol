//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

//import "./Safemath.sol";
//import "./PancakeFactory.sol";
import "./PancakeRouter.sol";
import "./Open-Zeppelin.sol";

// import "hardhat/console.sol";

contract Pledge07Up is
Initializable, ContextUpgradeable, IERC20Upgradeable, IERC20MetadataUpgradeable, OwnableUpgradeable {

    /////////////////////////////////////////////////////////////////////////////////////
    //
    //                      These variables are not deployed.
    //
    /////////////////////////////////////////////////////////////////////////////////////

    uint8 public constant DECIMALS = 18;
    uint256 public constant INITIAL_SUPPLY = 1e15 * 10 ** uint256(DECIMALS);

    /////////////////////////////////////////////////////////////////////////////////////
    //
    //                      Borrows from ERC20Upgradeable 
    //
    // _transfer(...) is overriden.
    //
    /////////////////////////////////////////////////////////////////////////////////////

    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    /**
     * @dev Sets the values for {name} and {symbol}.
     *
     * The default value of {decimals} is 18. To select a different value for
     * {decimals} you should overload it.
     *
     * All two of these values are immutable: they can only be set once during
     * construction.
     */
    function __ERC20_init(string memory name_, string memory symbol_) internal {
        __Context_init_unchained();
        __Ownable_init();
        __ERC20_init_unchained(name_, symbol_);
    }

    function __ERC20_init_unchained(string memory name_, string memory symbol_) internal {
        _name = name_;
        _symbol = symbol_;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the bep20 token owner which is necessary for binding with bep2 token
     */
	function getOwner() public view returns (address) {
		return owner();
	}

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the value {ERC20} uses, unless this function is
     * overridden;
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view virtual override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * Requirements:
     *
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for ``sender``'s tokens of at least
     * `amount`.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        // console.log("transferFrom", sender, recipient, amount);

        _transfer(sender, recipient, amount);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        //unchecked {
        _approve(sender, _msgSender(), currentAllowance - amount);
        //}

        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        //unchecked {
        _approve(_msgSender(), spender, currentAllowance - subtractedValue);
        //}

        return true;
    }



    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add( amount);
        emit Transfer(address(0), account, amount);

        _afterTokenTransfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        //unchecked {
        _balances[account] = accountBalance.sub(amount);
        //}
        _totalSupply = _totalSupply.sub(amount);

        emit Transfer(account, address(0), amount);

        _afterTokenTransfer(account, address(0), amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Hook that is called before any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}

    /**
     * @dev Hook that is called after any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * has been transferred to `to`.
     * - when `from` is zero, `amount` tokens have been minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens have been burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}


    /////////////////////////////////////////////////////////////////////////////////////
    //
    //                      Borrows from ERC20BurnableUpgradeable 
    //
    /////////////////////////////////////////////////////////////////////////////////////

    function __ERC20Burnable_init() internal {
        __Context_init_unchained();
        __ERC20Burnable_init_unchained();
    }

    function __ERC20Burnable_init_unchained() internal {
    }
    /**
     * @dev Destroys `amount` tokens from the caller.
     
     * See {ERC20-_burn}.
     */
    function burn(uint256 amount) public virtual {
        _burn(_msgSender(), amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, deducting from the caller's
     * allowance.
     *
     * See {ERC20-_burn} and {ERC20-allowance}.
     *
     * Requirements:
     *
     * - the caller must have allowance for ``accounts``'s tokens of at least
     * `amount`.
     */
    function burnFrom(address account, uint256 amount) public virtual {
        uint256 currentAllowance = allowance(account, _msgSender());
        require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
        //unchecked {
        _approve(account, _msgSender(), currentAllowance - amount);
        //}
        _burn(account, amount);
    }

    /////////////////////////////////////////////////////////////////////////////////////
    //
    //                      Borrows from ERC20PresetFixedSupplyUpgradeable 
    //
    /////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Mints `initialSupply` amount of token and transfers them to `owner`.
     *
     * See {ERC20-constructor}.
     */
    function __ERC20PresetFixedSupply_init(
        string memory __name,
        string memory __symbol,
        uint256 initialSupply,
        address owner
    ) internal initializer {
        __Context_init_unchained();
		__Ownable_init_unchained();
        __ERC20_init_unchained(__name, __symbol);
        __ERC20Burnable_init_unchained();
        __ERC20PresetFixedSupply_init_unchained(initialSupply, owner);
    }

    function __ERC20PresetFixedSupply_init_unchained(
        uint256 initialSupply,
        address owner
    ) internal initializer {
        _mint(owner, initialSupply);
    }


	///////////////////////////////////////////////////////////////////////////////////////////////
	//
	// The state data items of this contract are packed below, after those of the base contracts.
	// The items are tightly arranged for efficient packing into 32-bytes slots.
	// See https://docs.soliditylang.org/en/v0.8.9/internals/layout_in_storage.html for more.
	//
	// Do NOT make any changes to this packing when you upgrade this implementation.
	// See https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies for more.
	//
	//////////////////////////////////////////////////////////////////////////////////////////////

    uint256 public constant FEE_MAGNIFIER = 100000; // Five zeroes.
    uint256 public constant FEE_HUNDRED_PERCENT = FEE_MAGNIFIER * 100;

    uint256 public constant INITIAL_LOWER_MARKETING_FEE = 375;      // this/FEE_MAGNIFIER = 0.00375 or 0.375%
    uint256 public constant INITIAL_LOWER_CHARITY_FEE = 125;        // this/FEE_MAGNIFIER = 0.00125 or 0.125%
    uint256 public constant INITIAL_LOWER_LIQUIDITY_FEE = 375;      // this/FEE_MAGNIFIER = 0.00375 or 0.375%
    uint256 public constant INITIAL_LOWER_LOTTERY_FEE = 125;        // this/FEE_MAGNIFIER = 0.00125 or 0.125%

    uint256 public constant INITIAL_HIGHER_MARKETING_FEE = 1500;    // this/FEE_MAGNIFIER = 0.01500 or 1.500%
    uint256 public constant INITIAL_HIGHER_CHARITY_FEE = 500;       // this/FEE_MAGNIFIER = 0.00500 or 0.500%
    uint256 public constant INITIAL_HIGHER_LIQUIDITY_FEE = 1500;    // this/FEE_MAGNIFIER = 0.01500 or 1.500%
    uint256 public constant INITIAL_HIGHER_LOTTERY_FEE = 500;       // this/FEE_MAGNIFIER = 0.00500 or 0.500%
   
    address public constant INITIAL_GENERAL_CHARITY = 0x8887Df2F38888117c0048eAF9e26174F2E75B8eB;

    uint256 public constant MAX_TRANSFER_AMOUNT = 1e12 * 10**uint256(DECIMALS);
    uint256 public constant LIQUIDITY_QUANTUM = 1e5 * 10**uint256(DECIMALS);
    uint256 public constant MIN_HODL_TIME_SECONDS  = 31556952; // A year spans 31556952 seconds.

	using SafeMath for uint256;

    event SwapAndLiquify(
        uint256 tokenSwapped,
        uint256 etherReceived,
        uint256 tokenLiquified,
        uint256 etherLiquified
    );

	struct Fees {
		uint256 marketing;
		uint256 charity;
		uint256 liquidity;
		uint256 lottery;
	}

	struct FeeBalances {
		uint256 marketing;
		uint256 charity;
		uint256 liquidity;
		uint256 lottery;
	}

	struct Beneficiaries {
		address marketing;
		address charity;
		address liquidity;
		address lottery;
	}

    event FreeFromFees(address user, bool free);
    event SetFees(Fees fees, bool lowerNotHigher);

    Fees public initialLowerFees;
    Fees public lowerFees;
    Fees public initialHigherFees;
    Fees public higherFees;

    Beneficiaries public beneficiaries;

    uint256 public maxTransferAmount;
	uint256 public liquidityQuantum;
    uint256 public minHoldTimeSec;

	IPancakeRouter02 public pancakeRouter;
	address public pancakePair;

    address public generalCharityAddress;
	mapping(address => bool) public isCharityAddress;
	mapping(address => address) public preferredCharityAddress;

    mapping(address => bool) public isFeeFree;
	mapping(address => uint) public lastTransferTime;

    bool public autoliquify; // Place this bool type at the bottom of storage.
    bool public beneficiariesSet;

	///////////////////////////////////////////////////////////////////////////////////////////////
	//
	// The logic (operational code) of the implementation.
	// You can upgrade this part of the implementation freely: 
	// - add new state data itmes.
	// - override, add, or remove.
	// You cannot make changes to the above existing state data items.
	//
	//////////////////////////////////////////////////////////////////////////////////////////////


    function initialize() public virtual initializer { // onlyOwwer is impossible call here.
        __Ownable_init();
        __ERC20PresetFixedSupply_init("Pledge Utility Token", "POC", INITIAL_SUPPLY, owner());
        __Pledge_init();
    }

    function __Pledge_init() public {

        __Pledge_init_unchained();
    }


    function __Pledge_init_unchained() public onlyOwner {

		initialLowerFees.marketing = INITIAL_LOWER_MARKETING_FEE;
		initialLowerFees.charity = INITIAL_LOWER_CHARITY_FEE;
		initialLowerFees.liquidity = INITIAL_LOWER_LIQUIDITY_FEE;
		initialLowerFees.lottery = INITIAL_LOWER_LOTTERY_FEE;
        
        setFees(initialLowerFees, true); 

        initialHigherFees.marketing = INITIAL_HIGHER_MARKETING_FEE;
		initialHigherFees.charity = INITIAL_HIGHER_CHARITY_FEE;
		initialHigherFees.liquidity = INITIAL_HIGHER_LIQUIDITY_FEE;
		initialHigherFees.lottery = INITIAL_HIGHER_LOTTERY_FEE;
        
        setFees(initialHigherFees, false);

        generalCharityAddress = INITIAL_GENERAL_CHARITY;

		maxTransferAmount = MAX_TRANSFER_AMOUNT;
		liquidityQuantum = LIQUIDITY_QUANTUM;
        minHoldTimeSec = MIN_HODL_TIME_SECONDS;

        autoliquify = false;
    }

    function feeBalances() external view returns(FeeBalances memory balances) {
        balances.marketing = _balances[beneficiaries.marketing];
        balances.charity = _balances[beneficiaries.charity];
        balances.liquidity = _balances[beneficiaries.liquidity];
        balances.lottery = _balances[beneficiaries.lottery];
    }

    function _checkFees(Fees memory fees) internal pure returns(uint256 total) {
        require(fees.marketing <= FEE_HUNDRED_PERCENT, "Fee out of range");

        require(fees.marketing <= FEE_HUNDRED_PERCENT, "Marketing fee out of range");
        require(fees.charity <= FEE_HUNDRED_PERCENT, "Charity fee out of range");
        require(fees.lottery <= FEE_HUNDRED_PERCENT, "Lottery fee out of range");
        require(fees.liquidity <= FEE_HUNDRED_PERCENT, "Liquidity fee out of range");
        total = fees.marketing + fees.charity + fees.lottery + fees.liquidity;
        require(total <= FEE_HUNDRED_PERCENT, "Total fee out of range");
    }

    function restoreFees(bool lowerNotHigher) virtual public onlyOwner {
        if(lowerNotHigher == true) {
            lowerFees = initialLowerFees;
            emit SetFees(lowerFees, lowerNotHigher);
        } else {
            higherFees = initialHigherFees;
            emit SetFees(higherFees, lowerNotHigher);
        }
    }


	bool liquifying;
	modifier lockliquifying {
		require(!liquifying, "Nested liquifying.");
		liquifying = true;
		_;
		liquifying = false;
	}

    function setMinHoldTimeSec( uint256 _minHoldTimeSec ) virtual external onlyOwner {
        minHoldTimeSec = _minHoldTimeSec;
    }

	function setMaxTransferAmount(uint256 _maxTransferAmount) virtual external onlyOwner {
		maxTransferAmount = _maxTransferAmount;
	}
    
    function toLiquify( bool _autoLiquify ) external virtual onlyOwner {
        autoliquify = _autoLiquify;
    }

	function setBeneficiaries(Beneficiaries memory _beneficiaries) virtual external onlyOwner {
        require( _beneficiaries.liquidity == address(this), "Wrong liquidity account");

        _freeFromFees(beneficiaries.charity, false);
        _freeFromFees(beneficiaries.marketing, false);
        _freeFromFees(beneficiaries.lottery, false);
        _freeFromFees(beneficiaries.liquidity, false);

        beneficiaries = _beneficiaries;

        _freeFromFees(_beneficiaries.charity, true);
        _freeFromFees(_beneficiaries.marketing, true);
        _freeFromFees(_beneficiaries.lottery, true);
        _freeFromFees(_beneficiaries.liquidity, true);

        beneficiariesSet = true;
	}

	function createLiquidityPool( address _routerAddress ) virtual external onlyOwner {
		IPancakeRouter02 _pancakeRouter = IPancakeRouter02(_routerAddress);
		pancakeRouter = _pancakeRouter;

        pancakePair = IPancakeFactory(_pancakeRouter.factory()).getPair(address(this), _pancakeRouter.WETH());

        if(pancakePair == address(0)) {
    		pancakePair = IPancakeFactory(_pancakeRouter.factory()).createPair(address(this), _pancakeRouter.WETH());
        }
    }   
   
    function setFees(Fees memory fees, bool lowerNotHigher) virtual public onlyOwner {
        _checkFees(fees);

        if(lowerNotHigher) {
            lowerFees = fees;
            emit SetFees(lowerFees, lowerNotHigher);
        } else {
            higherFees = fees;
            emit SetFees(higherFees, lowerNotHigher);
        }
    }

    function freeFromFees(address user, bool free) external virtual onlyOwner {
        _freeFromFees(user, free);
    }

    function _freeFromFees(address user, bool free) internal virtual {
        isFeeFree[user] = free;
        emit FreeFromFees(user, free);
    }

    function setGeneralCharityAddress(address _charityAddress) virtual external onlyOwner {
        // Allow zero-address.
        if(generalCharityAddress != address(0)) isCharityAddress[generalCharityAddress] = false;
        generalCharityAddress = _charityAddress;
        if(_charityAddress != address(0)) isCharityAddress[_charityAddress] = true;
    }

	function addCharityAddress(address _charityAddress) virtual external onlyOwner {
        // Assumption: unique or no existence.
        _addCharityAddress(_charityAddress);
	}

	function _addCharityAddress(address _charityAddress) internal virtual {
        // Assumption: unique or no existence.
        require(_charityAddress != address(0), "Invalid charity address");
        isCharityAddress[_charityAddress] = true;
	}

	function removeCharityAddress(address _charityAddress) virtual external onlyOwner {
        _removeCharityAddress(_charityAddress);
	}

	function _removeCharityAddress(address _charityAddress) internal virtual {
        require(_charityAddress != address(0), "Invalid charity address");
        isCharityAddress[_charityAddress] = false;
	}

	function changeCharityAddress(address _oldCharityAddress, address _newCharityAddress) virtual external onlyOwner {
        _removeCharityAddress(_oldCharityAddress);
        _addCharityAddress(_newCharityAddress);
	}

	function preferCharityAddress (address _charityAddress) virtual external {
        if( _charityAddress != address(0) )
            require (isCharityAddress[_charityAddress], "Charity address not found");
        // Allow overriding. Allow zero-addres, which de-prefers.
		preferredCharityAddress[msg.sender] = _charityAddress;
	}

    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "Transfer from zero address");
        require(recipient != address(0), "Transfer to zero address");

        _beforeTokenTransfer(sender, recipient, amount);

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "Transfer exceeds balance");

        if( ! _isUnlimitedTransfer(sender, recipient) ) {
            require(amount <= maxTransferAmount, "Transfer exceeds limit");
        }

        _balances[sender] -= amount;

   		if(! _isFeeFreeTransfer(sender, recipient) ) {
            require(beneficiariesSet == true, "Fee beneficiaries not set");
            _settleCharityRelation(sender, recipient);

            amount -= _payFees(sender, amount);
            // This block could move to _payFees(.), where, and only where, lastTransferTime has meanings and is used.
            lastTransferTime[sender] = block.timestamp;
            lastTransferTime[recipient] = block.timestamp;
        }

        _balances[recipient] += amount;

        emit Transfer(sender, recipient, amount);
        
        // Unlucky msg.sender will have to work on adding liquidity at their gas cost.
        if( autoliquify && !(sender == pancakePair) && !(recipient == pancakePair)) {
            _liquifyInQuantum();
        }
    }

    function _isUnlimitedTransfer(address sender, address recipient) internal view virtual returns (bool unlimited) {
        // Start from highly frequent occurences.
        unlimited = _isBidirUnlimitedAddress(sender)
            || _isBidirUnlimitedAddress(recipient)
            || (sender == owner() && recipient == pancakePair)
            || (sender == pancakePair && recipient == owner());
    }

    function _isBidirUnlimitedAddress(address _address) internal view virtual returns (bool unlimited) {
        unlimited = _address == beneficiaries.marketing
            || _address == beneficiaries.charity
            || _address == beneficiaries.liquidity
            || _address == beneficiaries.lottery
            || isCharityAddress[_address];
            // || _address == founder; // stands for the founders wallet?
            // || _address == preSale
    }

    function _isFeeFreeTransfer(address sender, address recipient) internal view virtual returns (bool feeFree) {
        // Start from highly frequent occurences.
        feeFree = _isBidirFeeFreeAddress(sender) 
            || _isBidirFeeFreeAddress(recipient)
            || (sender == owner() && recipient == pancakePair)    
            || (sender == pancakePair && recipient == owner());
    }

    function _isBidirFeeFreeAddress(address _address) internal view virtual returns (bool feeFree) {
        feeFree = isFeeFree[_address]
            || _address == beneficiaries.marketing
            || _address == beneficiaries.charity
            || _address == beneficiaries.liquidity
            || _address == beneficiaries.lottery;
    }

    function _settleCharityRelation(address sender, address recipient) internal virtual {
        // transferring directly to a charity that is not yes preferred.
        if(isCharityAddress[recipient] == true && preferredCharityAddress[sender] == address(0)) {
            preferredCharityAddress[sender] = recipient;
            beneficiaries.charity = recipient;
        } else {
            // which charity to pay charity tees to?
            beneficiaries.charity = generalCharityAddress;
            address preferred = preferredCharityAddress[sender];
            if( preferred != address(0) && isCharityAddress[preferred] ) { // && preferredCharityAddress[sender] != generalCharityAddress) {
                // isCharityAddress[preferred] is required because the owner can freely remove a charity address without knowing if its a holder's preferred charity.
                beneficiaries.charity = preferredCharityAddress[sender];
            }
            require(beneficiaries.charity != address(0), "Invalid charity");
        }
    }

    function _payFees(address sender, uint256 principal) internal virtual returns (uint256 totalCharge) {
        if(block.timestamp - lastTransferTime[sender] >= minHoldTimeSec) {
            totalCharge += _creditWithFees(sender, principal, lowerFees, beneficiaries);
            // console.log("_payFees. paying lower fees");
        } else {
            totalCharge += _creditWithFees(sender, principal, higherFees, beneficiaries);
            // console.log("_payFees. paying higher fees");
        }
	}


	function _creditWithFees(address sender, uint256 principal, Fees storage fees, Beneficiaries storage _beneficiaries) 
    virtual internal returns (uint256 total) {
        uint256 fee = principal.mul(fees.marketing).div(FEE_MAGNIFIER);
        _balances[_beneficiaries.marketing] += fee;
        emit Transfer(sender, _beneficiaries.marketing, fee);
        total += fee;
        // console.log("marketing fee : ", fee);

        fee = principal.mul(fees.charity).div(FEE_MAGNIFIER);
        _balances[_beneficiaries.charity] += fee;
        emit Transfer(sender, _beneficiaries.charity, fee);
        total += fee;
        // console.log("charity fee : ", fee);

        fee = principal.mul(fees.lottery).div(FEE_MAGNIFIER);
        _balances[_beneficiaries.lottery] += fee;
        emit Transfer(sender, _beneficiaries.lottery, fee);
        total += fee;
        // console.log("lottery fee : ", fee);

        fee = principal.mul(fees.liquidity).div(FEE_MAGNIFIER);
        _balances[_beneficiaries.liquidity] += fee;
        emit Transfer(sender, _beneficiaries.liquidity, fee);
        total += fee;
        // console.log("liquidity fee : ", fee);

		return total;
	}
    

    function liquify() external virtual onlyOwner {
        _liquifyInQuantum();
    }

    function _liquifyInQuantum() internal virtual lockliquifying {
		//////// NOTE: PLEASE EXPLAIN THE LOGIC STARTING HERE ////////
		/* We need to avoid both frequent small and a single huge rounds of liquidity addition, 
		thus effectively saving gas and supressing price fluctuation. */

        uint256 etherInitial = address(this).balance;

		uint256 amountToLiquify = _balances[beneficiaries.liquidity];

		if (amountToLiquify >= liquidityQuantum) {
			amountToLiquify = liquidityQuantum;
            uint256 tokenForEther;
            {
                uint256 _reserveToken; uint256 _reserveEther;

                address token0 = IPancakePair(pancakePair).token0();
                if (address(this) == token0) {
                    (_reserveToken, _reserveEther,) = IPancakePair(pancakePair).getReserves();
                } else {
                    (_reserveEther, _reserveToken,) = IPancakePair(pancakePair).getReserves();
                }
                uint256 b = 1998 * _reserveToken;
                tokenForEther = ( sqrt( b.mul(b) + 3992000 * _reserveToken * amountToLiquify) - b ) / 1996;
            }
           
            _swapForEther(tokenForEther);

            uint256 tokenAfterSwap = _balances[address(this)];
            uint256 etherAfterSwap = address(this).balance;

            uint256 tokenToAddLiq = amountToLiquify - tokenForEther;
            uint256 etherToAddLiq = etherAfterSwap - etherInitial;
            _addLiquidity(tokenToAddLiq, etherToAddLiq); // No gurantee that the both amounts are deposited without refund.

            uint256 tokenAfterAddLiq = _balances[address(this)];
            uint256 etherAfterAddLiq = address(this).balance;

            require(etherAfterAddLiq >= etherInitial, "\tEther loss in address(this) account");
            console.log("\tamountToLiquify = ", amountToLiquify);
            console.log("\t = tokenToAddLiq + tokenForEther: ", tokenToAddLiq, tokenForEther);
            console.log("\tetherInitial, etherAfterSwap = ", etherInitial, etherAfterSwap);
            console.log("\tether remainter = ", etherAfterAddLiq - etherInitial);
 
            emit SwapAndLiquify(
                tokenForEther,                      // tokenSwapped. token decreased by swap
                etherAfterSwap - etherInitial,      // etherReceived. ether increased by swap
                tokenAfterAddLiq - tokenAfterSwap,  // tokenLiquified. token decreased by addLiquidity
                etherAfterAddLiq - etherAfterSwap   // etherLiquified. ether decreased by addLiquidity
            );
		}
	}

	function _swapForEther(uint256 tokenAmount) virtual internal {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = pancakeRouter.WETH();

        _approve(address(this), address(pancakeRouter), tokenAmount);

        pancakeRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0,
            path,
            address(this),
            block.timestamp
        );
    }

    function _addLiquidity(uint256 tokenAmount, uint256 ethAmount) virtual internal {
        _approve(address(this), address(pancakeRouter), tokenAmount);

        pancakeRouter.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            owner(),
            block.timestamp
        );
    }

    receive() external payable {}

    function sqrt(uint256 x) internal pure returns (uint256 result) {
        if (x == 0) {
            return 0;
        }

        // Calculate the square root of the perfect square of a power of two that is the closest to x.
        uint256 xAux = uint256(x);
        result = 1;
        if (xAux >= 0x100000000000000000000000000000000) {
            xAux >>= 128;
            result <<= 64;
        }
        if (xAux >= 0x10000000000000000) {
            xAux >>= 64;
            result <<= 32;
        }
        if (xAux >= 0x100000000) {
            xAux >>= 32;
            result <<= 16;
        }
        if (xAux >= 0x10000) {
            xAux >>= 16;
            result <<= 8;
        }
        if (xAux >= 0x100) {
            xAux >>= 8;
            result <<= 4;
        }
        if (xAux >= 0x10) {
            xAux >>= 4;
            result <<= 2;
        }
        if (xAux >= 0x8) {
            result <<= 1;
        }

        // The operations can never overflow because the result is max 2^127 when it enters this block.
        //unchecked {
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1; // Seven iterations should be enough
            uint256 roundedDownResult = x / result;
            return result >= roundedDownResult ? roundedDownResult : result;
        //}
    }


    function ___test___setLastTransferTime(address holder, uint256 daysAgo) external virtual {
        lastTransferTime[holder] = block.timestamp - daysAgo * 24 * 3600;
    }

    uint256[10] private __gap;
}
