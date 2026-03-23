import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly db: PrismaService) {}

  create(createUserDto: CreateUserDto) {
    throw new Error('Method not implemented.');
  }

  findAll() {
    return this.db.user.findMany({
      where: {
        banned: false,
        deleted: false,
      },
    });
  }

  async findOne(id: number) {
    const user = await this.db.user.findFirst({
      where: {
        id,
        deleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.banned) {
      throw new ForbiddenException('User is banned');
    }

    return user;
  }

  async ban(userId: number) {
    const result = await this.db.user.updateMany({
      where: {
        id: userId,
        deleted: false,
      },
      data: {
        banned: true,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('User not found');
    }

    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      return await this.db.user.update({
        data: updateUserDto,
        where: {
          id,
          banned: false,
          deleted: false,
        },
      });
    } catch {
      return false;
    }
  }

  async remove(id: number) {
    const result = await this.db.user.updateMany({
      where: {
        id,
        deleted: false,
      },
      data: {
        deleted: true,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('User not found');
    }

    const user = await this.db.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
