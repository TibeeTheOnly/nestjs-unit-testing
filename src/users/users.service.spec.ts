/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from 'src/prisma.service';
import { getClient } from '@pkgverse/prismock';

const mockedClient: PrismaService & { reset(): Promise<void> } =
  await getClient({
    prismaClient: PrismaService,
    schemaPath: 'prisma/schema.prisma',
  });

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    await mockedClient.reset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockedClient },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll()', () => {
    it('should return one non-banned and non-deleted user', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: false,
        },
      });

      const users = await service.findAll();

      expect(users).toHaveLength(1);
    });

    it('should return an empty list', async () => {
      const users = await service.findAll();
      expect(users).toEqual([]);
    });

    it('should not return banned users', async () => {
      await mockedClient.user.create({
        data: {
          email: 'allowed@example.com',
          banned: false,
        },
      });

      await mockedClient.user.create({
        data: {
          email: 'banned@example.com',
          banned: true,
        },
      });

      const users = await service.findAll();

      expect(users).toHaveLength(1);
      expect(users[0]?.email).toBe('allowed@example.com');
    });

    it('should not return soft deleted users', async () => {
      await mockedClient.user.create({
        data: {
          email: 'active@example.com',
          banned: false,
        },
      });

      await mockedClient.user.create({
        data: {
          email: 'deleted@example.com',
          banned: false,
          deleted: true,
        },
      });

      const users = await service.findAll();

      expect(users).toHaveLength(1);
      expect(users[0]?.email).toBe('active@example.com');
    });
  });

  describe('findOne()', () => {
    it('should return one user by id', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: false,
        },
      });

      const user = await service.findOne(1);

      expect(user).toEqual({
        id: 1,
        email: 'user1@example.com',
        banned: false,
        deleted: false,
      });
    });

    it('should throw ForbiddenException if user is banned', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: true,
        },
      });

      await expect(service.findOne(1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user is soft deleted', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: false,
          deleted: true,
        },
      });

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('ban()', () => {
    it('should set banned=true for an existing user', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: false,
        },
      });

      const user = await service.ban(1);

      expect(user).toEqual({
        id: 1,
        email: 'user1@example.com',
        banned: true,
        deleted: false,
      });
    });

    it('should throw NotFoundException for non-existing user', async () => {
      await expect(service.ban(99)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for soft deleted user', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: false,
          deleted: true,
        },
      });

      await expect(service.ban(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('should change email if not banned', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: false,
        },
      });

      const success = await service.update(1, { email: 'changed@example.com' });

      expect(success).toBeTruthy();

      expect(
        await mockedClient.user.findUnique({
          where: { id: 1 },
        }),
      ).toEqual({
        id: 1,
        email: 'changed@example.com',
        banned: false,
        deleted: false,
      });
    });

    it('should not change email if banned', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: true,
        },
      });
      const success = await service.update(1, { email: 'changed@example.com' });
      expect(success).toBeFalsy();
      expect(
        await mockedClient.user.findUnique({
          where: { id: 1 },
        }),
      ).toEqual({
        id: 1,
        email: 'user1@example.com',
        banned: true,
        deleted: false,
      });
    });

    it('should not change email if user is soft deleted', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: false,
          deleted: true,
        },
      });

      const success = await service.update(1, { email: 'changed@example.com' });

      expect(success).toBeFalsy();
      expect(
        await mockedClient.user.findUnique({
          where: { id: 1 },
        }),
      ).toEqual({
        id: 1,
        email: 'user1@example.com',
        banned: false,
        deleted: true,
      });
    });
  });

  describe('remove()', () => {
    it('should soft delete an existing user', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: false,
        },
      });

      const user = await service.remove(1);

      expect(user).toEqual({
        id: 1,
        email: 'user1@example.com',
        banned: false,
        deleted: true,
      });
    });

    it('should soft delete banned users too', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: true,
        },
      });

      const user = await service.remove(1);

      expect(user).toEqual({
        id: 1,
        email: 'user1@example.com',
        banned: true,
        deleted: true,
      });
    });

    it('should throw NotFoundException for non-existing user', async () => {
      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for already soft deleted user', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: false,
          deleted: true,
        },
      });

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
