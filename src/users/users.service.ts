import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UsersService {
  constructor (private readonly db: PrismaService) {}

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return this.db.user.findMany();
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  /**
   * Changes the user's data.
   * Can only change them if not banned.
   * 
   * @param id The user's id
   * @param updateUserDto The data to change
   * @returns The user's modified data, or false if the user was banned.
   */
  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      return await this.db.user.update({
        data: updateUserDto,
        where: {
          id,
          banned: false
        }
      });
    } catch {
      // TODO: a kivétel típusát is vizsgálni
      return false;
    }
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
