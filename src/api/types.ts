export type CampusEnum = 'PALMARES' | 'AURORAS' | 'LIBERDADE';
export type MealPeriodEnum = 'LUNCH' | 'DINNER';
export type SnapshotStatusEnum = 'NO_QUEUE' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'FOOD_ENDED' | 'NO_DATA';
export type ReportStatusEnum = 'NO_QUEUE' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'FOOD_ENDED';
export type ExceptionTypeEnum = 'CLOSED' | 'CUSTOM_HOURS';

export type Restaurant = {
  public_id: string;
  name: string;
  campus: CampusEnum;
  lat: number;
  lng: number;
  geofence_radius_m: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RestaurantCreate = {
  name?: string | null;
  campus: CampusEnum;
  lat: number;
  lng: number;
  geofence_radius_m?: number;
  is_active?: boolean;
};

export type RestaurantUpdate = Partial<RestaurantCreate>;

export type QueueSnapshot = {
  meal_period: MealPeriodEnum;
  current_status: SnapshotStatusEnum;
  reports_last_15m: number;
  last_report_at: string | null;
  updated_at: string;
  confidence_score: number;
  data_freshness_minutes: number | null;
};

export type QueueSnapshotBulkItem = Omit<QueueSnapshot, 'data_freshness_minutes'> & {
  restaurant_public_id: string;
};

export type QueueReport = {
  public_id: string;
  status: ReportStatusEnum;
  meal_period: MealPeriodEnum;
  created_at: string;
};

export type QueueReportCreate = {
  status: ReportStatusEnum;
  lat: number;
  lng: number;
  accuracy_m?: number | null;
  is_mock_location?: boolean;
  geo_signature: string;
  geo_timestamp: number;
};

export type RestaurantSchedule = {
  public_id: string;
  weekday: number;
  meal_period: MealPeriodEnum;
  opens_at: string;
  closes_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RestaurantScheduleCreate = {
  weekday: number;
  meal_period: MealPeriodEnum;
  opens_at: string;
  closes_at: string;
  is_active?: boolean;
};

export type RestaurantScheduleUpdate = Partial<RestaurantScheduleCreate>;

export type ScheduleException = {
  public_id: string;
  exception_date: string;
  exception_type: ExceptionTypeEnum;
  meal_period: MealPeriodEnum | null;
  opens_at: string | null;
  closes_at: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type ActiveScheduleException = {
  exception: ScheduleException | null;
};

export type ScheduleExceptionCreate = {
  exception_date: string;
  exception_type: ExceptionTypeEnum;
  meal_period?: MealPeriodEnum | null;
  opens_at?: string | null;
  closes_at?: string | null;
  reason?: string | null;
};

export type ScheduleExceptionUpdate = Partial<Omit<ScheduleExceptionCreate, 'exception_date'>>;

export type SnapshotUpdatedEvent = {
  type: 'snapshot_updated';
  restaurant_public_id: string;
  meal_period: MealPeriodEnum;
  current_status: SnapshotStatusEnum;
  reports_last_15m: number;
  last_report_at: string | null;
  confidence_score: number;
  data_freshness_minutes: number | null;
  updated_at: string;
};

