// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DeWineMarketplace is ReentrancyGuard, Ownable, ERC1155Holder {

    mapping(uint256 => MarketItem) private marketItemIdToMarketItem;
    uint256 private _marketItemCounter = 1;

    //  NFT manager listing fee
    uint256 private listingFee = 0.01 ether;

    uint8 private constant LISTED = 1;
    uint8 private constant CANCELED = 2;
    uint8 private constant BOUGHT = 3;

    struct MarketItem {
        uint256 marketItemId;
        address tokenContractAddress;
        uint256 tokenId;
        uint256 tokenValue;
        address payable seller;
        uint256 price;
        uint8 state;
    }

    event MarketItemCreated(
        uint256 indexed marketItemId,
        address indexed tokenContractAddress,
        uint256 tokenId,
        uint256 tokenValue,
        address indexed seller,
        uint256 price
    );

    event MarketItemCanceled(
        uint256 indexed marketItemId,
        address indexed tokenContractAddress,
        uint256 tokenId,
        uint256 tokenValue,
        address indexed seller,
        uint256 price
    );

    event MarketItemBought(
        uint256 indexed marketItemId,
        address indexed tokenContractAddress,
        uint256 tokenId,
        uint256 value,
        address indexed buyer,
        uint256 price
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    function getListingFee() public view returns (uint256) {
        return listingFee;
    }

    function setListingFee(uint256 fee) public onlyOwner {
        listingFee = fee;
    }

    function createMarketItem(
        address tokenContractAddress,
        uint256 tokenId,
        uint256 tokenValue,
        uint256 price
    ) public payable nonReentrant returns (uint256) {
        require(price > 0, "Price must be at least 1 wei");
        require(
            msg.value == listingFee * tokenValue,
            "Value must be equal to listing price * token quantity"
        );

        uint256 marketItemId = _marketItemCounter;
        _marketItemCounter ++;

        marketItemIdToMarketItem[marketItemId] = MarketItem(
            marketItemId,
            tokenContractAddress,
            tokenId,
            tokenValue,
            payable(msg.sender),
            price,
            LISTED
        );

        IERC1155(tokenContractAddress).safeTransferFrom(
            msg.sender,
            address(this),
            tokenId,
            tokenValue,
            ""
        );

        // pay owner a listing fee
        payable(owner()).transfer(listingFee * tokenValue);

        emit MarketItemCreated(
            marketItemId,
            tokenContractAddress,
            tokenId,
            tokenValue,
            msg.sender,
            price
        );

        return marketItemId;
    }

    function cancelMarketItem(uint256 marketItemId) public nonReentrant {

        MarketItem memory marketItem = marketItemIdToMarketItem[marketItemId];
        
        require(marketItem.state == LISTED, "Item already canceled or bought");
        require(marketItem.seller == msg.sender, "You are not the seller");

        IERC1155(marketItem.tokenContractAddress).safeTransferFrom(
            address(this),
            msg.sender,
            marketItem.tokenId,
            marketItem.tokenValue,
            ""
        );

        marketItem.state = CANCELED;

        emit MarketItemCanceled(
            marketItemId,
            marketItem.tokenContractAddress,
            marketItem.tokenId,
            marketItem.tokenValue,
            msg.sender,
            marketItem.price
        );
    }

    function buyMarketItem(uint256 marketItemId, uint256 value) public payable nonReentrant {

        MarketItem memory marketItem = marketItemIdToMarketItem[marketItemId];

        require(marketItem.state == LISTED, "Item already canceled or bought");
        require(marketItem.tokenValue >= value, "Not enough tokens");
        require(
            msg.value == (marketItem.price * value),
            "Please submit the asking price in order to continue"
        );

        marketItem.seller.transfer(marketItem.price * value);
        IERC1155(marketItem.tokenContractAddress).safeTransferFrom(
            address(this),
            msg.sender,
            marketItem.tokenId,
            value,
            ""
        );

        marketItem.tokenValue -= value;

        if (marketItem.tokenValue == 0) {
            marketItem.state = BOUGHT;
        }

        emit MarketItemBought(
            marketItemId,
            marketItem.tokenContractAddress,
            marketItem.tokenId,
            value,
            msg.sender,
            marketItem.price
        );

    }
/* 
    function getLatestMarketItemByTokenId(uint256 tokenId)
        public
        view
        returns (MarketItem memory, bool)
    {
        uint256 itemsCount = _marketItemIds.current();

        for (uint256 i = itemsCount; i > 0; i--) {
            MarketItem memory item = marketItemIdToMarketItem[i];
            if (item.tokenId != tokenId) continue;
            return (item, true);
        }

        MarketItem memory emptyMarketItem;
        return (emptyMarketItem, false);
    }

    function fetchAvailableMarketItems()
        public
        view
        returns (MarketItem[] memory)
    {
        uint256 itemsCount = _marketItemIds.current();
        uint256 soldItemsCount = _tokensSold.current();
        uint256 canceledItemsCount = _tokensCanceled.current();
        uint256 availableItemsCount = itemsCount -
            soldItemsCount -
            canceledItemsCount;
        MarketItem[] memory marketItems = new MarketItem[](availableItemsCount);

        uint256 currentIndex = 0;
        for (uint256 i = 0; i < itemsCount; i++) {
            MarketItem memory item = marketItemIdToMarketItem[i + 1];
            if (item.owner != address(0)) continue;
            marketItems[currentIndex] = item;
            currentIndex += 1;
        }

        return marketItems;
    }

    function compareStrings(string memory a, string memory b)
        private
        pure
        returns (bool)
    {
        return (keccak256(abi.encodePacked((a))) ==
            keccak256(abi.encodePacked((b))));
    }

    function getMarketItemAddressByProperty(
        MarketItem memory item,
        string memory property
    ) private pure returns (address) {
        require(
            compareStrings(property, "seller") ||
                compareStrings(property, "owner"),
            "Parameter must be 'seller' or 'owner'"
        );

        return compareStrings(property, "seller") ? item.seller : item.owner;
    }

    function fetchSellingMarketItems()
        public
        view
        returns (MarketItem[] memory)
    {
        return fetchMarketItemsByAddressProperty("seller");
    }

    function fetchOwnedMarketItems() public view returns (MarketItem[] memory) {
        return fetchMarketItemsByAddressProperty("owner");
    }

    function fetchMarketItemsByAddressProperty(string memory _addressProperty)
        public
        view
        returns (MarketItem[] memory)
    {
        require(
            compareStrings(_addressProperty, "seller") ||
                compareStrings(_addressProperty, "owner"),
            "Parameter must be 'seller' or 'owner'"
        );
        uint256 totalItemsCount = _marketItemIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemsCount; i++) {
            MarketItem storage item = marketItemIdToMarketItem[i + 1];
            address addressPropertyValue = getMarketItemAddressByProperty(
                item,
                _addressProperty
            );
            if (addressPropertyValue != msg.sender) continue;
            itemCount += 1;
        }

        MarketItem[] memory items = new MarketItem[](itemCount);

        for (uint256 i = 0; i < totalItemsCount; i++) {
            MarketItem storage item = marketItemIdToMarketItem[i + 1];
            address addressPropertyValue = getMarketItemAddressByProperty(
                item,
                _addressProperty
            );
            if (addressPropertyValue != msg.sender) continue;
            items[currentIndex] = item;
            currentIndex += 1;
        }

        return items;
    } */
}