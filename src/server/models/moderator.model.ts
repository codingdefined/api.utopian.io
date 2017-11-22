import * as mongoose from 'mongoose';
import * as httpStatus from 'http-status';
import APIError from '../helpers/APIError';

/**
 * Moderator Schema
 */
const ModeratorSchema = new mongoose.Schema({
  account: {
    type: String,
    required: true,
    unique: true,
  },
  banned: Boolean,
  reviewed: Boolean,
  total_paid_rewards: Number,
  should_receive_rewards: Number,
  total_moderated: Number,
  percentage_total_rewards_moderators: Number,
});

export interface ModeratorSchemaDoc extends mongoose.Document {
}

export interface ModeratorSchemaModel extends mongoose.Model<ModeratorSchemaDoc> {
  get(account: any): any;
  list(): any;
  listAll(): any;
  listBeneficiaries(exclude?: any[]): any;
}

ModeratorSchema.statics = {
  get(account) {
    return this.findOne({ account })
      .exec()
      .then((moderator) => {
        if (moderator) {
          return moderator;
        }
        return null;
      });
  },
  list() {
    return this.find({
      banned: {
        '$ne': true,
      },
      reviewed: {
        '$eq': true,
      },
    })
      .sort({ total_moderated: -1 })
      .exec();
  },
  listAll() {
    return this.find()
      .exec();
  },
  listBeneficiaries(exclude?: any[]) {
    let query: any = {
      total_moderated: {
        '$gt': 0
      },
      banned: {
        '$ne': true,
      },
      reviewed: {
        '$eq': true,
      },
    };

    if (exclude && exclude.length) {
      query = {
        ...query,
        account: {
          $nin: exclude
        }
      }
    }

    return this.find(query)
      .sort({ should_receive_rewards: -1 })
      .limit(2)
      .exec();
  }
};

export default mongoose.model<ModeratorSchemaDoc, ModeratorSchemaModel>('Moderator', ModeratorSchema);
