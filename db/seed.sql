-- 酒蔵マスタデータ
-- map_position_x, map_position_y は マップ内の列、行
INSERT INTO breweries (booth_number, name, map_position_x, map_position_y, area) VALUES
-- ■ 最下段 (緑エリア)
-- 6行目 (No.14 - No.1)
(14, '阿部酒造', 1, 6, 'Lower Green'),
(13, '津南醸造', 2, 6, 'Lower Green'),
(12, '新潟銘醸', 3, 6, 'Lower Green'),
(11, 'マスカガミ', 4, 6, 'Lower Green'),
(10, '青木酒造', 5, 6, 'Lower Green'),
(9, '恩田酒造', 6, 6, 'Lower Green'),
(8, '中川酒造', 7, 6, 'Lower Green'),
(7, '松乃井酒造場', 8, 6, 'Lower Green'),
(6, '白瀧酒造', 9, 6, 'Lower Green'),
(5, '池浦酒造', 10, 6, 'Lower Green'),
(4, '福顔酒造', 11, 6, 'Lower Green'),
(3, '八海醸造', 12, 6, 'Lower Green'),
(2, '柏露酒造', 13, 6, 'Lower Green'),
(1, '関原酒造', 14, 6, 'Lower Green'),

-- 5行目 (No.28 - No.15)
(28, '朝日酒造', 1, 5, 'Upper Green'),
(27, '雪椿酒造', 2, 5, 'Upper Green'),
(26, 'お福酒造', 3, 5, 'Upper Green'),
(25, '魚沼酒造', 4, 5, 'Upper Green'),
(24, '越銘醸', 5, 5, 'Upper Green'),
(23, '高の井酒造', 6, 5, 'Upper Green'),
(22, '原酒造', 7, 5, 'Upper Green'),
(21, '長谷川酒造', 8, 5, 'Upper Green'),
(20, '諸橋酒造', 9, 5, 'Upper Green'),
(19, '緑川酒造', 10, 5, 'Upper Green'),
(18, '苗場酒造', 11, 5, 'Upper Green'),
(17, '河忠酒造', 12, 5, 'Upper Green'),
(16, '石塚酒造', 13, 5, 'Upper Green'),
(15, '玉川酒造', 14, 5, 'Upper Green'),

-- ■ 中段 (青/黄エリア) ※中央(8列目)は洗浄コーナー等のためスキップ
-- 4行目 (No.41 - No.29)
(41, '加茂錦酒造', 1, 4, 'Lower Blue'),
(40, '加賀の井酒造', 2, 4, 'Lower Blue'),
(39, '代々菊醸造', 3, 4, 'Lower Blue'),
(38, '尾畑酒造', 4, 4, 'Lower Blue'),
(37, 'よしかわ杜氏の郷', 5, 4, 'Lower Blue'),
(36, '鮎正宗酒造', 6, 4, 'Lower Blue'),
(35, '千代の光酒造', 7, 4, 'Lower Blue'),
-- 8列目は「おちょこ洗浄コーナー」のためスキップ
(34, '新潟第一酒造', 9, 4, 'Lower Blue'),
(33, '(資)竹田酒造店', 10, 4, 'Lower Blue'),
(32, '上越酒造', 11, 4, 'Lower Blue'),
(31, '武蔵野酒造', 12, 4, 'Lower Blue'),
(30, '雪と里山醸造所', 13, 4, 'Lower Blue'),
(29, '吉乃川', 14, 4, 'Lower Blue'),

-- 3行目 (No.54 - No.42)
(54, '天領盃酒造', 1, 3, 'Upper Blue'),
(53, '小山酒造店', 2, 3, 'Upper Blue'),
(52, '加藤酒造', 3, 3, 'Upper Blue'),
(51, '田原酒造', 4, 3, 'Upper Blue'),
(50, '丸山酒造場', 5, 3, 'Upper Blue'),
(49, '田中酒造', 6, 3, 'Upper Blue'),
(48, '妙高酒造', 7, 3, 'Upper Blue'),
-- 8列目は「さかすけ」のためスキップ
(47, '猪又酒造', 9, 3, 'Upper Blue'),
(46, '逸見酒造', 10, 3, 'Upper Blue'),
(45, '頚城酒造', 11, 3, 'Upper Blue'),
(44, '(有)加藤酒造店', 12, 3, 'Upper Blue'),
(43, '栃倉酒造', 13, 3, 'Upper Blue'),
(42, '葵酒造', 14, 3, 'Upper Blue'),

-- ■ 最上段 (ピンクエリア)
-- 2行目 (No.68 - No.55)
(68, '宮尾酒造', 1, 2, 'Lower Pink'),
(67, '君の井酒造', 2, 2, 'Lower Pink'),
(66, 'サケアイ', 3, 2, 'Lower Pink'),
(65, '峰乃白梅酒造', 4, 2, 'Lower Pink'),
(64, '高野酒造', 5, 2, 'Lower Pink'),
(63, '近藤酒造', 6, 2, 'Lower Pink'),
(62, '今代司酒造', 7, 2, 'Lower Pink'),
(61, '弥彦酒造', 8, 2, 'Lower Pink'),
(60, 'ＤＨＣ酒造', 9, 2, 'Lower Pink'),
(59, 'ふじの井酒造', 10, 2, 'Lower Pink'),
(58, '越後鶴亀', 11, 2, 'Lower Pink'),
(57, 'ラグーン ブリュワリー', 12, 2, 'Lower Pink'),
(56, 'たからやま醸造', 13, 2, 'Lower Pink'),
(55, '麒麟山酒造', 14, 2, 'Lower Pink'),

-- 1行目 (No.82 - No.69)
(82, '北雪酒造', 1, 1, 'Upper Pink'),
(81, '笹祝酒造', 2, 1, 'Upper Pink'),
(80, '白龍酒造', 3, 1, 'Upper Pink'),
(79, '下越酒造', 4, 1, 'Upper Pink'),
(78, '越つかの酒造', 5, 1, 'Upper Pink'),
(77, '塩川酒造', 6, 1, 'Upper Pink'),
(76, '越後酒造場', 7, 1, 'Upper Pink'),
(75, '大洋酒造', 8, 1, 'Upper Pink'),
(74, '越後桜酒造', 9, 1, 'Upper Pink'),
(73, '金鵄盃酒造', 10, 1, 'Upper Pink'),
(72, '金升酒造', 11, 1, 'Upper Pink'),
(71, '菊水酒造', 12, 1, 'Upper Pink'),
(70, '王紋酒造', 13, 1, 'Upper Pink'),
(69, '石本酒造', 14, 1, 'Upper Pink');