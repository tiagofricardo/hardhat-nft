const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Random Ipfs Nft Tests", function () {
          let deployer, randomIpfsNft, vrfCoordinatorV2Mock, mintFee
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              randomIpfsNft = await ethers.getContract("RandomIpfsNft", deployer)
              mintFee = await randomIpfsNft.getMintFee()
          })

          describe("constructor", function () {
              it("Initializes random ipfs nft", async function () {
                  const tokenCounter = await randomIpfsNft.getTokenCounter()
                  assert.equal(mintFee.toString(), networkConfig[chainId].mintFee)
                  assert.equal(tokenCounter.toString(), "0")
              })
          })

          describe("request nft", function () {
              it("request ntf without eth", async function () {
                  await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
                      "RandomIpfsNft__NeedMoreETHSent"
                  )
              })
              it("request ntf with eth", async function () {
                  await expect(randomIpfsNft.requestNft({ value: mintFee })).to.emit(
                      randomIpfsNft,
                      "NftRequested"
                  )
              })
          })

          describe("fulfillRandomWords", function () {
              it("mints NFT after random number", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async () => {
                          try {
                              const tokenUri = await randomIpfsNft.tokenURI("0")
                              const tokenCounter = await randomIpfsNft.getTokenCounter()
                              assert.equal(tokenUri.toString().includes("ipfs://"), true)
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const requestNftResponse = await randomIpfsNft.requestNft({
                              value: mintFee,
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              randomIpfsNft.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })

          describe("getBreedFromModdedRng", () => {
              it("should return Image_1", async function () {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(7)
                  assert.equal(0, expectedValue)
              })
              it("should return Image_2 if moddedRng is between 10 - 39", async function () {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(21)
                  assert.equal(1, expectedValue)
              })
              it("should return Image_3 is between 40 - 99", async function () {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(77)
                  assert.equal(2, expectedValue)
              })
              it("should revert if moddedRng > 99", async function () {
                  await expect(randomIpfsNft.getBreedFromModdedRng(100)).to.be.revertedWith(
                      "RandomIpfsNft__RangeOutOfBounds"
                  )
              })
          })
      })
