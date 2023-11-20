import type { MigrationInterface, QueryRunner } from 'typeorm'

export class indexTwistId1700484408073 implements MigrationInterface {
    name = 'indexTwistId1700484408073'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE INDEX `IDX_bb5c51b9806c01de5b44d0e033` ON `user` (`twistId`)',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX `IDX_bb5c51b9806c01de5b44d0e033` ON `user`')
    }
}
