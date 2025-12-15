
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Wallets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING,
        defaultValue: 'USD',
      },
      balance: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.createTable('Transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      walletId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Wallets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('FUND', 'TRANSFER_IN', 'TRANSFER_OUT'),
        allowNull: false,
      },
      amount: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      reference: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Transactions');
    await queryInterface.dropTable('Wallets');
    await queryInterface.sequelize.query('DROP TYPE "enum_Transactions_type";').catch(() => {});
  },
};
