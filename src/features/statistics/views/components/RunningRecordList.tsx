import { t, useAppLanguage } from '~/i18n';
/**
 * Running Record List Component (Infinite Scroll)
 */

import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { EmptyState } from './EmptyState';
import { RunningRecordCard } from './RunningRecordCard';
import { useRunningRecordList } from '../../viewmodels/useRunningRecordList';
import { PRIMARY, GREY } from '~/shared/styles';

interface RunningRecordListProps {
  startDate?: Date;
  endDate?: Date;
  emptyMessage?: string;
}

export const RunningRecordList: React.FC<RunningRecordListProps> = ({
  startDate,
  endDate,
  emptyMessage = t("러닝을 시작하면 기록이 생겨요!"),
}) => {
  useAppLanguage();
  const {
    records,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useRunningRecordList({ ...(startDate && { startDate }), ...(endDate && { endDate }) });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color={PRIMARY[600]} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t("기록을 불러올 수 없습니다")}</Text>
      </View>
    );
  }

  if (records.length === 0) {
    return (
      <EmptyState message={emptyMessage} />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <RunningRecordCard record={item} />}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={PRIMARY[600]} />
            </View>
          ) : null
        }
        scrollEnabled={false}
        nestedScrollEnabled
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 10,
  },
  centerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: GREY[500],
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
