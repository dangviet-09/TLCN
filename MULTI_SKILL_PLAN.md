# Multi-Skill Tagging - Implementation Plan

## 4 Rào Chắn Bảo Mật (TUÂN THỦ TUYỆT ĐỐI)

1. Khong tao bang DB moi - chi them cot `skills` vao bang `career_paths`.
2. Khong sua, xoa, hay doi ten bat ky bien/ham nao dang co san.
3. Khong thay doi cau truc Endpoints API.
4. Khong sua model `CareerTest` hay `Test` - chi lam viec voi bang `career_paths` (bang Course/CareerPath trong code).

---

## Lộ Trình 3 Phase

- [x] **Phase 1**: Backend Database & Models (Sequelize)
- [x] **Phase 2**: Backend Services (Cập nhật Logic Lưu trữ & Parse Dữ liệu)
- [x] **Phase 3**: Frontend Giao diện (Ant Design Form)

---

## Chi Tiết Từng Phase

---

### Phase 1: Backend Database & Models (Sequelize)

**Tổng quan:**
Them truong `skills` (DataTypes.JSON) vao Sequelize Model `CareerPath` va xuat cau lenh SQL ALTER TABLE de tu chay tren MySQL.

#### 1.1. Sequelize Model - `TLCN_GROUP7_BE/src/models/careerPathModel.js`

**File:** `D:\4th Year\Semester 2\2\MMS\TLCN_GROUP7_BE\src\models\careerPathModel.js`

Them truong `skills` vao object definition (giua `isFeatured` va closing brace cua model definition):

```javascript
skills: {
  type: DataTypes.JSON,
  defaultValue: [],
  allowNull: true
}
```

**Vi tri chen (sau truong `isFeatured`, truoc `}, {`):**

```javascript
// Line 38-42 hien tai:
isFeatured: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
  allowNull: false
}
// Chen sau do:
// Line 43: }, {

// Chen truong skills vao day:
skills: {
  type: DataTypes.JSON,
  defaultValue: [],
  allowNull: true
}
```

#### 1.2. SQL ALTER TABLE (Chay tay tren MySQL)

Bang can sua: `career_paths`

**Cau lenh SQL:**

```sql
-- Kiem tra xem cot da ton tai chua
-- Neu chua co, chay:
ALTER TABLE career_paths
ADD COLUMN skills JSON DEFAULT ('[]') NULL;
```

**Hoac neu muon dam bao (IF NOT EXISTS):**

```sql
ALTER TABLE career_paths
ADD COLUMN IF NOT EXISTS skills JSON DEFAULT ('[]') NULL;
```

> **Luu y:** Cau lenh `IF NOT EXISTS` chi hoat dong tren MySQL 8.0+. Neu MySQL 5.x, kiem tra truoc bang:
> ```sql
> SHOW COLUMNS FROM career_paths LIKE 'skills';
> ```
> Neu ket qua rong -> chay ALTER TABLE phia tren.

---

### Phase 2: Backend Services (Cập nhật Logic Lưu trữ & Parse Dữ liệu)

**Tổng quan:**
Cap nhat 4 ham trong 2 file service de xu ly truong `skills` tu payload, voi logic parse JSON an toan (try-catch) de xu ly FormData stringify.

#### 2.1. `careerPathService.js`

**File:** `D:\4th Year\Semester 2\2\MMS\TLCN_GROUP7_BE\src\services\careerPathService.js`

**A. Ham `createCareerPath` (dong 8-84)**

Trong block `db.CareerPath.create(...)`, them `skills` vao payload tao:

```javascript
// Xu ly skills - parse an toan
let parsedSkills = [];
if (data.skills !== undefined && data.skills !== null) {
  if (Array.isArray(data.skills)) {
    parsedSkills = data.skills;
  } else if (typeof data.skills === 'string') {
    try {
      const parsed = JSON.parse(data.skills);
      parsedSkills = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      parsedSkills = [];
    }
  }
}

// Trong db.CareerPath.create(), them:
const careerPath = await db.CareerPath.create({
  // ... cac truong hien co...
  skills: parsedSkills
});
```

**B. Ham `updateCourse` (dong 86-142)**

Trong `course.update({...})`, them `skills`:

```javascript
// Xu ly skills - parse an toan
let parsedSkills = undefined;
if (data.skills !== undefined && data.skills !== null) {
  if (Array.isArray(data.skills)) {
    parsedSkills = data.skills;
  } else if (typeof data.skills === 'string') {
    try {
      const parsed = JSON.parse(data.skills);
      parsedSkills = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      parsedSkills = [];
    }
  }
}

await course.update({
  // ... cac truong hien co...
  ...(parsedSkills !== undefined && { skills: parsedSkills })
});
```

#### 2.2. `courseService.js`

**File:** `D:\4th Year\Semester 2\2\MMS\TLCN_GROUP7_BE\src\services\courseService.js`

**A. Ham `createCourse` (dong 12-69)**

Giong nhu ben tren - them xu ly skills vao `db.CareerPath.create({...})`:

```javascript
// Xu ly skills - parse an toan
let parsedSkills = [];
if (data.skills !== undefined && data.skills !== null) {
  if (Array.isArray(data.skills)) {
    parsedSkills = data.skills;
  } else if (typeof data.skills === 'string') {
    try {
      const parsed = JSON.parse(data.skills);
      parsedSkills = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      parsedSkills = [];
    }
  }
}

// Trong db.CareerPath.create(), them:
const course = await db.CareerPath.create({
  // ... cac truong hien co...
  skills: parsedSkills
});
```

**B. Ham `updateCourse` (dong 71-115)**

Giong nhu ben tren - them xu ly skills vao `course.update({...})`:

```javascript
// Xu ly skills - parse an toan
let parsedSkills = undefined;
if (data.skills !== undefined && data.skills !== null) {
  if (Array.isArray(data.skills)) {
    parsedSkills = data.skills;
  } else if (typeof data.skills === 'string') {
    try {
      const parsed = JSON.parse(data.skills);
      parsedSkills = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      parsedSkills = [];
    }
  }
}

await course.update({
  // ... cac truong hien co...
  ...(parsedSkills !== undefined && { skills: parsedSkills })
});
```

---

### Phase 3: Frontend Giao diện (Ant Design Form)

**Tổng quan:**
Them truong `skills` vao Form tao Course cua Company bang Ant Design `Select mode="tags"`. Cap nhat TypeScript interface va logic submit.

#### 3.1. Cap Nhat TypeScript Interface - `CourseFormValues`

**File:** `D:\4th Year\Semester 2\2\MMS\TLCN_GROUP_FE\src\pages\Company\CompanyCourseManage.tsx`

Them truong `skills` vao interface:

```typescript
interface CourseFormValues {
  title: string;
  description?: string;
  category?: string;
  level?: string;
  isFeatured?: boolean;
  publishedAt?: dayjs.Dayjs;
  skills?: string[];  // <-- Them dong nay
}
```

#### 3.2. Cap Nhat Payload trong `handleCreateCourse`

Trong ham `handleCreateCourse`, them `skills` vao payload gui len API:

```typescript
const payload: Record<string, unknown> = {
  title: values.title.trim(),
  description: values.description?.trim() || null,
  category: values.category || null,
  level: values.level || null,
  isFeatured: values.isFeatured ?? false,
  skills: values.skills ?? [],  // <-- Them dong nay
};
if (values.publishedAt) {
  payload.publishedAt = values.publishedAt.toISOString();
}
```

#### 3.3. Them Select Tags vao Form (JSX)

**Vi tri chen:** Sau `</Form.Item>` cuoi cung cua `publishedAt`/`isFeatured`, truoc `</div>` grid 2 cot cuoi cung.

Them Form.Item cho truong skills:

```tsx
<Form.Item name="skills" label="Ky nang (Skills)">
  <Select
    mode="tags"
    style={{ width: '100%' }}
    placeholder="Nhap ten ky nang (VD: NodeJS, ReactJS) va an Enter..."
    tokenSeparators={[',']}
  />
</Form.Item>
```

**Vi tri chen chinh xac:** Sau dong `</Form.Item>` cuoi cung (dong 319 - `</Form.Item>` cua `isFeatured`), chen truoc `</div>` (dong 320 - dong `</div>` dong sau grid 2 cot), va truoc `</Form>`.

Do can chen ngoai grid 2 cot, chen ngay truoc `</div>` cuoi cung cua Form body (truoc dong 322 `</div>`).

#### 3.4. Hien Thi Skills Tren Table (Optional - Bo sung)

Trong `columns` cua Table, them cot hien thi skills:

```tsx
{
  title: "Ky nang",
  dataIndex: "skills",
  key: "skills",
  width: 200,
  render: (skills: string[] | null) =>
    skills && skills.length > 0 ? (
      <>
        {skills.slice(0, 3).map((skill) => (
          <Tag key={skill} color="purple">{skill}</Tag>
        ))}
        {skills.length > 3 && (
          <Tag>+{skills.length - 3}</Tag>
        )}
      </>
    ) : <Tag>—</Tag>,
},
```

---

## Tom Tat Thay Doi Theo File

| # | File | Thay doi |
|---|------|----------|
| 1 | `TLCN_GROUP7_BE/src/models/careerPathModel.js` | Them truong `skills: { type: DataTypes.JSON, defaultValue: [], allowNull: true }` |
| 2 | `TLCN_GROUP7_BE/src/services/careerPathService.js` | Them xu ly skills trong `createCareerPath` va `updateCourse` |
| 3 | `TLCN_GROUP7_BE/src/services/courseService.js` | Them xu ly skills trong `createCourse` va `updateCourse` |
| 4 | `TLCN_GROUP_FE/src/pages/Company/CompanyCourseManage.tsx` | Them `skills` vao interface, payload, Form Select tags, va Table column |

## Quy Trinh Test Sau Khi Hoan Thanh

1. Chay SQL ALTER TABLE tren MySQL.
2. Restart backend server.
3. Mo trang "Quan ly Khoa hoc" cua Company.
4. Tao mot khoa hoc moi, nhap cac ky nang: `ReactJS`, `NodeJS`, `MySQL`.
5. Nhan "Tao khoa hoc" -> Kiem tra khoa hoc duoc tao thanh cong.
6. Mo chi tiet khoa hoc tren MySQL: `SELECT id, title, skills FROM career_paths WHERE ...` de xac nhan truong skills da duoc luu dung.
7. Kiem tra cot "Ky nang" tren table frontend hien thi dung.
